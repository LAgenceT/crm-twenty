# Déploiement VPS Contabo — Twenty CRM

Hébergement auto-géré, alternative au déploiement Railway (voir
[DEPLOY-RAILWAY.md](DEPLOY-RAILWAY.md), bloqué par un plafond mémoire de 1 Go).

## Serveur

| Champ | Valeur |
|---|---|
| Hôte | `169.58.213.156` (Contabo) |
| Alias SSH | `vps` (`root`, clé `~/.ssh/id_vps_contabo`) |
| OS | Ubuntu 24.04.4 LTS |
| Ressources | 6 vCPU, 11 Go RAM, 193 Go disque |
| Répertoire | `/opt/twenty` |

## Stack

`docker-compose.yml` dans `/opt/twenty`, quatre services :

| Service | Image | Exposition |
|---|---|---|
| `db` | `postgres:16` | interne |
| `redis` | `redis:7` | interne |
| `server` | `twentycrm/twenty:latest` | `127.0.0.1:3000` |
| `worker` | `twentycrm/twenty:latest` (`yarn worker:prod`) | interne |

Le serveur n'écoute que sur la boucle locale : seul Nginx l'expose.

Volumes nommés : `db-data`, `redis-data`, `server-local-data`.

## Secrets

`/opt/twenty/.env`, permissions `600`, généré **sur le VPS** (`openssl rand`) :
`PG_DATABASE_PASSWORD`, `ENCRYPTION_KEY`. Ces valeurs ne sont pas versionnées
et n'ont jamais transité hors du serveur.

## Reverse proxy

`/etc/nginx/sites-available/twenty`, `server_name crm.lagence-t.fr`.
Proxy vers `127.0.0.1:3000`, en-têtes `X-Forwarded-*`, support WebSocket,
`client_max_body_size 100M`, `proxy_read_timeout 300s`.
Le vhost `default` est désactivé.

L'emplacement `/.well-known/acme-challenge/` est ouvert sur `/var/www/html`
pour le challenge HTTP-01.

Pare-feu UFW : 22, 80, 443.

## Consommation observée

| Conteneur | Mémoire |
|---|---|
| `worker` | 973 Mo |
| `server` | 664 Mo |
| `db` | 43 Mo |
| `redis` | 5 Mo |

Total ~2,6 Go sur 11 Go. À comparer au plafond de 1 Go par conteneur du plan
Railway, qui empêchait le serveur de démarrer.

## SSL — reste à faire

Le certificat n'est **pas** émis : ni `crm.lagence-t.fr` ni
`twenty.lagence-t.fr` n'ont d'enregistrement A. Let's Encrypt valide en
HTTP-01, le domaine doit donc résoudre vers le VPS au préalable.

Une fois l'enregistrement `A crm.lagence-t.fr → 169.58.213.156` propagé :

```bash
ssh vps 'certbot --nginx -d crm.lagence-t.fr --agree-tos -m contact@lagence-t.fr --redirect --non-interactive'
```

Certbot ajoute le bloc TLS, la redirection 80 → 443, et le renouvellement
automatique (`certbot.timer` déjà actif et activé au boot).

Si un autre sous-domaine est retenu, modifier `server_name` dans le vhost et
`SERVER_URL` dans `/opt/twenty/.env`, puis `docker compose up -d server worker`.

## Exploitation

```bash
ssh vps 'cd /opt/twenty && docker compose ps'          # état
ssh vps 'cd /opt/twenty && docker compose logs -f server'
ssh vps 'cd /opt/twenty && docker compose restart server'
ssh vps 'cd /opt/twenty && docker compose pull && docker compose up -d'   # mise à jour
```

`restart: always` sur chaque service et `docker` activé au boot : la stack
remonte seule après un redémarrage du VPS.

## Points ouverts

- **Sauvegardes** : aucune. À mettre en place (`pg_dump` planifié + copie hors
  du VPS) avant la première donnée client réelle.
- **Image `latest`** : non épinglée, à la demande. Un `docker compose pull`
  peut donc changer de version sans préavis. Épingler une version explicite
  est préférable en production.
- **Stockage fichiers** : `STORAGE_TYPE=local` sur volume Docker. Sauvegardé
  uniquement si le volume `server-local-data` est inclus dans les backups.
- **Email** : aucun SMTP configuré, les invitations utilisateur ne partiront pas.
- **Métier** : cette instance est vierge. La configuration de l'étape 2
  (objets Dossier/Prestation, pipelines, référentiels) a été appliquée sur
  l'instance Railway et devra être rejouée ici — voir [MODELE-CRM.md](MODELE-CRM.md).
