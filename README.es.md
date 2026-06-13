# ProjectFlare

Gestión de proyectos ligera y nativa de Cloudflare para equipos pequeños.

ProjectFlare es un sistema operativo de proyectos ligero diseñado para ejecutarse sobre Cloudflare Workers, D1, R2, Queues y Zero Trust. Está pensado para equipos que quieren tareas, planificación tipo gantt, notas wiki, entrada desde GitHub/webhooks, pantallas de administración multilingües y, más adelante, acceso MCP sin operar VPS, hosts Docker, PostgreSQL, Redis, Nginx ni certificados.

ProjectFlare no intenta reemplazar Jira, Linear, Notion, Redmine u OpenProject de una sola vez. El objetivo es una capa operativa pequeña y nativa de Cloudflare que haga visible el trabajo del proyecto para personas técnicas, no técnicas, webhooks, GitHub y agentes de IA.

## Posicionamiento

- GitHub: seguimiento de implementación
- ProjectFlare: seguimiento del proyecto y estado de entrega
- Wiki: especificaciones, contexto, decisiones y runbooks
- Gantt: visibilidad de calendario y dependencias
- Webhooks: entrada desde sistemas externos
- MCP: futura superficie de operación para agentes de IA

## Funciones

- Administrar workspaces y proyectos desde una UI hospedada en Cloudflare
- Crear tareas con estado, prioridad, responsable, categoría, etiquetas, hito, fechas, progreso y tarea principal
- Administrar estados de tarea por proyecto con color, orden y semántica de completado/archivo
- Seguir tareas anidadas, dependencias, métricas de estado, tableros estilo kanban y una vista simple de planificación tipo gantt
- Agregar comentarios de tarea ordenados por más recientes, con carga acotada y expansión de textos largos
- Escribir descripciones de tareas, comentarios y páginas wiki con un editor enriquecido respaldado por Markdown
- Subir imágenes y videos ligeros a tareas y páginas wiki
- Insertar medios subidos en comentarios o páginas wiki como Markdown
- Pegar o soltar imágenes/videos directamente en editores de comentarios y wiki para subirlos e insertarlos
- Crear y editar páginas wiki Markdown con historial de revisiones
- Vincular repositorios GitHub y recibir eventos webhook de issues, comentarios y pull requests
- Crear endpoints Generic Webhook con token que convierten JSON externo en tareas
- Enviar notificaciones de la app y notificaciones salientes por Slack, Lark o Generic Webhook
- Instalar plugins first-party con capabilities, hooks, routes y almacenamiento con scope de plugin
- Usar la UI de administración en 18 locales: `ar`, `de`, `en`, `es-419`, `es-ES`, `eu`, `fa`, `fr`, `id`, `ja`, `ko`, `nb`, `pl`, `pseudo`, `pt-BR`, `th`, `zh-CN` y `zh-TW`
- Usar layout RTL para árabe y persa

## Documentación

- [Development](./docs/development.md)
- [Deployment](./docs/deployment.md)
- [Architecture](./docs/architecture.md)

## Sincronización con GitHub

- Vincular un repositorio GitHub a un proyecto de ProjectFlare
- Recibir webhooks de GitHub en `/api/github/webhook`
- Verificar `X-Hub-Signature-256` cuando `GITHUB_WEBHOOK_SECRET` está configurado
- Procesar webhooks de GitHub mediante Cloudflare Queues
- Sincronizar GitHub issues como tareas
- Sincronizar comentarios de GitHub issues como comentarios de tareas
- Actualizar tareas vinculadas desde eventos de pull request cuando el cuerpo del PR contiene URLs de GitHub issues

Para desarrollo local, el secreto del webhook de GitHub es opcional. En producción, configura `GITHUB_WEBHOOK_SECRET` como Worker secret.

## Webhooks y notificaciones

- Crear endpoints Generic Webhook con token por proyecto
- Aceptar `Authorization: Bearer <token>` o `X-ProjectFlare-Token`
- Aplicar mapping simple por endpoint para `source` y prioridad predeterminada
- Guardar notificaciones de la app para tareas de webhook, comentarios y eventos GitHub issue/comment/PR
- Agregar canales de notificación saliente para Generic Webhook, Slack o URLs compatibles con Lark
- Enviar payloads Slack Incoming Webhook con blocks o payloads JSON compactos a los canales configurados

Los tokens de Generic Webhook creados en la UI se muestran una sola vez. Guárdalos en el sistema externo que enviará tareas a ProjectFlare.

## Frontend

La UI de administración es una app React/Vite en `apps/web`.

- Selector de proyecto, métricas de resumen, tabla de tareas y panel de comentarios
- Vista de planificación tipo gantt con etiquetas de dependencia
- Editor Markdown con Lexical para descripciones de tareas, comentarios y páginas wiki
- Lista de páginas wiki, adjuntos multimedia y lista de revisiones
- Vista de integraciones para eventos GitHub, endpoints Generic Webhook, canales de notificación y notificaciones de la app
- Selector de idioma para los 18 locales soportados actualmente

La selección de idioma se guarda en `localStorage` como `projectflare.locale`.

## Despliegue

ProjectFlare se despliega con Wrangler y los recursos Cloudflare declarados en `wrangler.toml`. El flujo OSS predeterminado no requiere Terraform ni setup shell script.

Consulta [Deployment](./docs/deployment.md) para D1, R2, Queues, Access, secrets, migrations y comandos de despliegue.

## Generic Webhook

Haz POST de JSON a:

```txt
/api/webhooks/generic/:projectId
```

Ejemplo:

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

## No objetivos

El alcance inicial de ProjectFlare evita deliberadamente convertirse en un clon completo de Jira, Linear, Notion o Redmine. La prioridad es una base ligera Cloudflare-only que conecte tareas, GitHub, notas wiki, planificación gantt y entrada por webhook con baja carga operativa.
