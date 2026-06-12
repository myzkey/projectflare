import type { Notification, NotificationChannel } from "../../../../../core/src/domain/notification";
import type {
  NotificationDelivery,
  NotificationRepository,
  NotificationUseCasePorts,
  ProjectNotificationInput,
} from "../../../../../core/src/ports/notifications";
import type { Env } from "../env";
import { createNotificationDelivery } from "../notifications/delivery";

export function createNotificationUseCasePorts(env: Env): NotificationUseCasePorts {
  return {
    ids: {
      create: () => crypto.randomUUID(),
    },
    clock: {
      now: () => new Date().toISOString(),
    },
    notifications: createD1NotificationRepository(env),
    delivery: createNotificationDelivery(),
  };
}

export function createD1NotificationRepository(env: Env): NotificationRepository {
  return {
    listChannels: async (projectId) => {
      if (!env.DB) return [];

      const { results } = await env.DB.prepare(
        `SELECT *
         FROM notification_channels
         WHERE project_id = ?
         ORDER BY created_at DESC`,
      )
        .bind(projectId)
        .all<NotificationChannel>();

      return results;
    },
    createChannel: async (channel) => {
      if (!env.DB) return;

      await env.DB.prepare(
        `INSERT INTO notification_channels (id, project_id, name, channel_type, target_url, enabled)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(channel.id, channel.project_id, channel.name, channel.channel_type, channel.target_url, channel.enabled)
        .run();
    },
    listNotifications: async (projectId, limit) => {
      if (!env.DB) return [];

      const { results } = await env.DB.prepare(
        `SELECT *
         FROM notifications
         WHERE project_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
        .bind(projectId, limit)
        .all<Notification>();

      return results;
    },
    createNotification: async (notification) => {
      if (!env.DB) return;

      await env.DB.prepare(
        `INSERT INTO notifications (id, project_id, title, body, source)
         VALUES (?, ?, ?, ?, ?)`,
      )
        .bind(notification.id, notification.project_id, notification.title, notification.body, notification.source)
        .run();
    },
    markRead: async (notificationId) => {
      if (!env.DB) return;

      await env.DB.prepare(
        `UPDATE notifications
         SET read_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
        .bind(notificationId)
        .run();
    },
  };
}

export function createNoopNotificationDelivery(): NotificationDelivery {
  return {
    send: async (_channel: NotificationChannel, _input: ProjectNotificationInput) => {},
  };
}
