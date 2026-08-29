# CRM L'Agence T & NRJ Home — basé sur Twenty

CRM sur mesure pour bureau d'études thermique et rénovation énergétique.

Ce dépôt est un fork de [twentyhq/twenty](https://github.com/twentyhq/twenty).
Les développements spécifiques à L'Agence T et NRJ Home sont documentés ici ;
le reste du dépôt suit l'upstream Twenty.

## Stack

| Couche | Technologie |
|---|---|
| Langage | TypeScript |
| Front | React |
| Back | NestJS |
| Base de données | PostgreSQL |
| Cache / files | Redis |

## Entités

Deux entités juridiques distinctes partagent le CRM :

| Code | Entité | Rôle |
|---|---|---|
| `BE` | L'Agence T | Bureau d'études |
| `TRX` | NRJ Home | Travaux |

Chaque affaire, contact et document doit être rattaché à l'une des deux entités.

## Activités

- Audit (audit énergétique)
- MAR (Mon Accompagnateur Rénov')
- AMO Copro (assistance à maîtrise d'ouvrage en copropriété)
- Réno globale (rénovation globale)
- Architecture

## Pipelines métier à développer

### Audit énergétique
```
Commande reçue → Visite planifiée → En production → Livré → Facturé
```

### MAR
```
Contrat signé → Visite & audit → Projet travaux → Dossier aides → Travaux → Rapport
```

### AMO Copro
```
Pré-analyse → Proposition → Voté AG → Dossier Anah → Travaux → Solde versé
```

### Réno globale
```
Estimation → Devis signé → Chantier planifié → En cours → Réception → Soldé
```

### Architecture
```
Brief → Avant-projet → Plans livrés → Suivi travaux → Soldé
```

## Modèle de contacts

### Types

- Lead
- Client
- Apporteur
- Sous-traitant
- Partenaire

### Sous-types

- Agence immobilière
- Notaire
- Syndic
- Régie
- Particulier

## Référentiel géographique

Périmètre d'intervention : **53 communes des Alpes-Maritimes (06)**.

La liste nominative des 53 communes reste à intégrer comme référentiel de données
(table de référence, utilisée pour le rattachement géographique des affaires et
le filtrage des rapports).

## État du projet

Fork initial de Twenty. Aucun développement métier n'est encore implémenté :
ce document sert de cadrage pour les pipelines, entités et référentiels à créer.
