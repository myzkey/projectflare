# ProjectFlare

Gestion de projet légère et native Cloudflare pour petites équipes.

ProjectFlare est un OS de projet léger conçu pour fonctionner sur Cloudflare Workers, D1, R2, Queues et Zero Trust. Il s’adresse aux équipes qui veulent gérer tâches, planification gantt, notes wiki, entrées GitHub/webhook, écrans d’administration multilingues et, à terme, accès MCP sans exploiter de VPS, hôte Docker, PostgreSQL, Redis, Nginx ni certificats.

ProjectFlare ne cherche pas à remplacer Jira, Linear, Notion, Redmine ou OpenProject d’un seul coup. L’objectif est une petite couche opérationnelle native Cloudflare qui rend le travail projet visible aux ingénieurs, non-ingénieurs, webhooks, GitHub et agents IA.

## Positionnement

- GitHub : suivi d’implémentation
- ProjectFlare : suivi projet et état de livraison
- Wiki : spécifications, contexte, décisions et runbooks
- Gantt : visibilité du calendrier et des dépendances
- Webhooks : entrée depuis les systèmes externes
- MCP : future surface d’opération pour agents IA

## Fonctionnalités

- Gérer workspaces et projets depuis une UI d’administration hébergée sur Cloudflare
- Créer des tâches avec statut, priorité, responsable, catégorie, étiquettes, jalon, dates, progression et tâche parente
- Gérer des statuts de tâches propres au projet avec couleur, ordre et sémantique terminé/archivé
- Suivre tâches imbriquées, dépendances, métriques de statut, tableaux type kanban et vue simple de planification type gantt
- Ajouter des commentaires de tâche du plus récent au plus ancien, avec chargement limité et expansion des textes longs
- Rédiger descriptions de tâches, commentaires et pages wiki avec un éditeur enrichi sauvegardé en Markdown
- Téléverser images et vidéos légères vers les tâches et pages wiki
- Insérer les médias téléversés dans les commentaires ou pages wiki en Markdown
- Coller ou déposer images/vidéos directement dans les éditeurs de commentaires et wiki pour les téléverser et les insérer
- Créer et éditer des pages wiki Markdown avec historique de révision
- Lier des dépôts GitHub et recevoir les événements webhook issue, comment et pull request
- Créer des endpoints Generic Webhook tokenisés qui transforment du JSON externe en tâches
- Envoyer des notifications applicatives et des notifications sortantes Slack, Lark ou Generic Webhook
- Installer des plugins first-party déclarant capabilities, hooks, routes et stockage scoped par plugin
- Utiliser l’UI d’administration en 18 locales : `ar`, `de`, `en`, `es-419`, `es-ES`, `eu`, `fa`, `fr`, `id`, `ja`, `ko`, `nb`, `pl`, `pseudo`, `pt-BR`, `th`, `zh-CN` et `zh-TW`
- Utiliser une mise en page RTL pour l’arabe et le persan

## Documentation

- [Development](./docs/development.md)
- [Deployment](./docs/deployment.md)
- [Architecture](./docs/architecture.md)

## Synchronisation GitHub

- Lier un dépôt GitHub à un projet ProjectFlare
- Recevoir les webhooks GitHub sur `/api/github/webhook`
- Vérifier `X-Hub-Signature-256` lorsque `GITHUB_WEBHOOK_SECRET` est configuré
- Traiter les webhooks GitHub via Cloudflare Queues
- Synchroniser les GitHub issues en tâches
- Synchroniser les commentaires de GitHub issues en commentaires de tâches
- Mettre à jour les tâches liées depuis les événements pull request lorsque le corps du PR contient des URLs de GitHub issues

En développement local, le secret de webhook GitHub est facultatif. En production, configurez `GITHUB_WEBHOOK_SECRET` comme Worker secret.

## Webhooks et notifications

- Créer des endpoints Generic Webhook tokenisés par projet
- Accepter `Authorization: Bearer <token>` ou `X-ProjectFlare-Token`
- Appliquer un mapping simple par endpoint pour `source` et priorité par défaut
- Stocker les notifications applicatives pour tâches webhook, commentaires et événements GitHub issue/comment/PR
- Ajouter des canaux de notification sortante pour Generic Webhook, Slack ou URLs compatibles Lark
- Envoyer des payloads Slack Incoming Webhook avec blocks ou des payloads JSON compacts vers les canaux configurés

Les tokens Generic Webhook créés dans l’UI ne sont affichés qu’une seule fois. Stockez-les dans le système externe qui enverra les tâches vers ProjectFlare.

## Frontend

L’UI d’administration est une app React/Vite sous `apps/web`.

- Sélecteur de projet, métriques de synthèse, table de tâches et panneau de commentaires
- Vue de planification type gantt avec libellés de dépendance
- Éditeur Markdown basé sur Lexical pour descriptions de tâches, commentaires et pages wiki
- Liste de pages wiki, pièces jointes média et liste de révisions
- Vue intégrations pour événements GitHub, endpoints Generic Webhook, canaux de notification et notifications applicatives
- Sélecteur de langue couvrant les 18 locales actuellement prises en charge

Le choix de langue est stocké dans `localStorage` sous `projectflare.locale`.

## Déploiement

ProjectFlare est déployé avec Wrangler et les ressources Cloudflare déclarées dans `wrangler.toml`. Le flux OSS par défaut ne nécessite pas Terraform ni setup shell script.

Voir [Deployment](./docs/deployment.md) pour D1, R2, Queues, Access, secrets, migrations et commandes de déploiement.

## Generic Webhook

Envoyez du JSON en POST vers :

```txt
/api/webhooks/generic/:projectId
```

Exemple :

```json
{
  "title": "Investigate failed checkout",
  "description": "Stripe dispute from customer report",
  "source": "stripe",
  "priority": "urgent",
  "dueDate": "2026-06-18",
  "assignee": "ops@example.com",
  "labels": ["support", "billing"],
  "externalUrl": "https://example.com/cases/123"
}
```

## Non-objectifs

Le périmètre initial de ProjectFlare évite délibérément de devenir un clone complet de Jira, Linear, Notion ou Redmine. La priorité est une base légère Cloudflare-only qui relie tâches, GitHub, notes wiki, planification gantt et entrées webhook avec une faible charge opérationnelle.
