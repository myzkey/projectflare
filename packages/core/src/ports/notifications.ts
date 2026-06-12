import type { Notification, NotificationChannel } from "../domain/notification";

export type ProjectNotificationInput = {
  title: string;
  body: string;
  source: string;
};

export type NotificationRepository = {
  listChannels(projectId: string): Promise<NotificationChannel[]>;
  createChannel(channel: NotificationChannel): Promise<void>;
  listNotifications(projectId: string, limit: number): Promise<Notification[]>;
  createNotification(notification: Notification): Promise<void>;
  markRead(notificationId: string): Promise<void>;
};

export type NotificationDelivery = {
  send(channel: NotificationChannel, input: ProjectNotificationInput): Promise<void>;
};

export type NotificationUseCasePorts = {
  ids: {
    create(): string;
  };
  clock: {
    now(): string;
  };
  notifications: NotificationRepository;
  delivery: NotificationDelivery;
};
