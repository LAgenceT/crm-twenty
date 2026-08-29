# Déploiement Railway — CRM L'Agence T

Instance Twenty auto-hébergée sur Railway.

## Projet

| Champ | Valeur |
|---|---|
| Projet | `crm-twenty` |
| Project ID | `06add0f4-60d6-4d7a-9258-c1ca4b51523f` |
| Environnement | `production` |
| Région | `europe-west4` (Pays-Bas — UE, RGPD) |
| Workspace | lagencet's Projects |

## Services

| Service | Source | Rôle |
|---|---|---|
| `Postgres` | template Railway PostgreSQL | Base de données |
| `Redis` | template Railway Redis | Cache et files de jobs |
| `twenty-server` | `twentycrm/twenty:v2.37.0` | API + front, port 3000 |
| `twenty-worker` | `twentycrm/twenty:v2.37.0` | Jobs asynchrones |

URL publique : https://twenty-server-production-0c40.up.railway.app

Le worker utilise le start command `yarn worker:prod` ; le serveur expose un
healthcheck sur `/healthz`.

## Variables d'environnement

Les URLs de connexion utilisent les *reference variables* Railway : aucun secret
n'est écrit en dur, tout est résolu côté serveur.

### twenty-server

| Variable | Valeur |
|---|---|
| `NODE_PORT` | `3000` |
| `PG_DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `SERVER_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
| `STORAGE_TYPE` | `local` |
| `DISABLE_DB_MIGRATIONS` | `false` |
| `DISABLE_CRON_JOBS_REGISTRATION` | `false` |
| `ENCRYPTION_KEY` | secret (généré via `openssl rand -base64 32`) |

### twenty-worker

Mêmes variables, à trois différences près :

| Variable | Valeur |
|---|---|
| `SERVER_URL` | `https://${{twenty-server.RAILWAY_PUBLIC_DOMAIN}}` |
| `DISABLE_DB_MIGRATIONS` | `true` (le serveur les exécute déjà) |
| `DISABLE_CRON_JOBS_REGISTRATION` | `true` (idem) |

`ENCRYPTION_KEY` doit être **strictement identique** entre le serveur et le
worker, sans quoi le worker ne peut pas déchiffrer les données de la base.

## Reproduire le déploiement

```bash
railway init --name crm-twenty
railway add -d postgres
railway add -d redis

railway add -s twenty-server -i twentycrm/twenty:v2.37.0 \
  -v 'NODE_PORT=3000' \
  -v 'PG_DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  -v 'REDIS_URL=${{Redis.REDIS_URL}}' \
  -v 'SERVER_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}' \
  -v 'STORAGE_TYPE=local' \
  -v 'DISABLE_DB_MIGRATIONS=false' \
  -v 'DISABLE_CRON_JOBS_REGISTRATION=false'

railway add -s twenty-worker -i twentycrm/twenty:v2.37.0 \
  -v 'PG_DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  -v 'REDIS_URL=${{Redis.REDIS_URL}}' \
  -v 'SERVER_URL=https://${{twenty-server.RAILWAY_PUBLIC_DOMAIN}}' \
  -v 'STORAGE_TYPE=local' \
  -v 'DISABLE_DB_MIGRATIONS=true' \
  -v 'DISABLE_CRON_JOBS_REGISTRATION=true'

# Clé de chiffrement, identique sur les deux services
openssl rand -base64 32 > /tmp/key
tr -d '\n' < /tmp/key | railway variables set --stdin ENCRYPTION_KEY --service twenty-server
tr -d '\n' < /tmp/key | railway variables set --stdin ENCRYPTION_KEY --service twenty-worker

# Start command du worker (non exposé par `railway add`)
railway api 'mutation($serviceId:String!,$input:ServiceInstanceUpdateInput!){serviceInstanceUpdate(serviceId:$serviceId,input:$input)}' \
  --raw-var serviceId=<worker-service-id> \
  --var 'input={"startCommand":"yarn worker:prod"}'

railway domain --service twenty-server --port 3000
```

## Pièges rencontrés (à ne pas refaire)

### `railway redeploy` ne reprend pas la configuration du service

`railway redeploy` **rejoue le snapshot du déploiement précédent**. Les réglages
posés entre-temps via `serviceInstanceUpdate` (région, healthcheck, start
command, pre-deploy) ne sont pas repris et restent inactifs, silencieusement.

Utiliser systématiquement :

```bash
railway redeploy --service <nom> -y --from-source
```

Pour vérifier ce qui est réellement déployé, lire le manifest :

```bash
railway api 'query($id:String!){deployment(id:$id){status meta}}' --raw-var id=<deployment-id>
```

et contrôler `startCommand`, `preDeployCommand`, `multiRegionConfig`.

### La région se pose via `multiRegionConfig`, pas via `region`

Le champ `region` de `ServiceInstanceUpdateInput` est accepté (retourne `true`)
mais reste sans effet. C'est `multiRegionConfig` qui fait foi :

```bash
--var 'input={"multiRegionConfig":{"europe-west4":{"numReplicas":1}}}'
```

### `SERVER_URL` doit être valide AVANT le premier boot

Au tout premier déploiement le domaine public n'existe pas encore, donc
`${{RAILWAY_PUBLIC_DOMAIN}}` est vide et `SERVER_URL` vaut `https://`.
La validation de config échoue, `database:init:prod` avorte — mais **après**
avoir créé le schéma `core`. Or l'entrypoint ne teste que l'existence de ce
schéma pour décider de lancer l'init : elle est donc sautée à tous les boots
suivants, et l'instance reste durablement sans tables.

Ordre correct : créer le service → créer le domaine → *puis* déployer.

Pour rattraper une instance déjà dans cet état, forcer l'init via le
pre-deploy (les scripts sont idempotents) :

```bash
railway api 'mutation($serviceId:String!,$input:ServiceInstanceUpdateInput!){serviceInstanceUpdate(serviceId:$serviceId,input:$input)}' \
  --raw-var serviceId=<server-service-id> \
  --var 'input={"preDeployCommand":"yarn database:init:prod","preDeployTimeoutSeconds":1800}'
railway redeploy --service twenty-server -y --from-source
```

Ne lancer **qu'un seul** déploiement à la fois : deux pre-deploys concurrents
exécutent les migrations en parallèle sur la même base et l'un des deux échoue.

### `/healthz` ne teste pas la base

`/healthz` est un liveness check qui répond `200` même avec une base vide.
Le vrai signal de santé applicative est `/client-config`, qui lit
`core.keyValuePair` :

```bash
curl -s -o /dev/null -w '%{http_code}' https://<domaine>/client-config
```

## Points d'attention

- **Stockage de fichiers** : `STORAGE_TYPE=local` écrit dans le conteneur.
  Sans volume Railway monté sur `/app/packages/twenty-server/.local-storage`,
  les pièces jointes sont perdues à chaque redéploiement. À basculer sur S3
  (`STORAGE_TYPE=s3`) avant toute mise en production réelle.
- **Version d'image** : épinglée à `v2.37.0` plutôt que `latest`, pour éviter
  une montée de version non maîtrisée au redéploiement.
- **Email** : aucun driver SMTP configuré ; les invitations utilisateur et les
  emails transactionnels ne partiront pas tant que `EMAIL_*` n'est pas renseigné.
- **`preDeployCommand`** : laissé à `yarn database:init:prod` sur `twenty-server`.
  Les scripts sont idempotents, ce qui garantit que les migrations passent avant
  qu'une nouvelle version ne prenne le trafic. Coût : environ deux minutes
  ajoutées à chaque déploiement.
- **Sauvegardes** : aucune politique de backup configurée sur le Postgres Railway.
  À mettre en place avant la première donnée client réelle.
