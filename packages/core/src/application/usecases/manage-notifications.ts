import { ApplicationError } from "../../domain/errors";
import type { Notification, NotificationChannel } from "../../domain/notification";
import type { NotificationUseCasePorts, ProjectNotificationInput } from "../../ports/notifications";

export async function listNotificationChannelsUseCase(
  projectId: string,
  ports: NotificationUseCasePorts,
): Promise<NotificationChannel[]> {
  return ports.notifications.listChannels(projectId);
}

export async function createNotificationChannelUseCase(
  input: {
    projectId: string;
    name?: string | null;
    channelType?: string | null;
    targetUrl?: string | null;
  },
  ports: NotificationUseCasePorts,
): Promise<NotificationChannel> {
  const channelType = normalizeChannelType(input.channelType);
  const channel: NotificationChannel = {
    id: ports.ids.create(),
    project_id: input.projectId,
    name: input.name?.trim() || `${channelType} channel`,
    channel_type: channelType,
    target_url: input.targetUrl?.trim() || "",
    enabled: 1,
    created_at: ports.clock.now(),
    updated_at: ports.clock.now(),
  };

  if (!channel.target_url) throw new ApplicationError("notification_target_url_required", 400);

  await ports.notifications.createChannel(channel);
  return channel;
}

export async function listNotificationsUseCase(
  projectId: string,
  ports: NotificationUseCasePorts,
  limit = 30,
): Promise<Notification[]> {
  return ports.notifications.listNotifications(projectId, limit);
}

export async function markNotificationReadUseCase(
  notificationId: string,
  ports: NotificationUseCasePorts,
): Promise<{ id: string; read: true }> {
  await ports.notifications.markRead(notificationId);
  return { id: notificationId, read: true };
}

export async function notifyProjectUseCase(
  projectId: string,
  input: ProjectNotificationInput,
  ports: NotificationUseCasePorts,
): Promise<Notification> {
  const notification: Notification = {
    id: ports.ids.create(),
    project_id: projectId,
    title: input.title,
    body: input.body,
    source: input.source,
    read_at: null,
    created_at: ports.clock.now(),
  };

  await ports.notifications.createNotification(notification);
  const channels = await ports.notifications.listChannels(projectId);
  await Promise.all(
    channels.filter((channel) => channel.enabled).map((channel) => ports.delivery.send(channel, input)),
  );
  return notification;
}

function normalizeChannelType(value: string | null | undefined): NotificationChannel["channel_type"] {
  return value === "slack" || value === "lark" ? value : "webhook";
}
