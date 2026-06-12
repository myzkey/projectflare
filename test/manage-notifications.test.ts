import { describe, expect, it, vi } from "vitest";
import {
  createNotificationChannelUseCase,
  notifyProjectUseCase,
} from "../packages/core/src/application/usecases/manage-notifications";
import { ApplicationError } from "../packages/core/src/domain/errors";
import type { Notification, NotificationChannel } from "../packages/core/src/domain/notification";
import type { NotificationUseCasePorts } from "../packages/core/src/ports/notifications";

function createPorts(channels: NotificationChannel[] = []) {
  const notifications: Notification[] = [];
  const sent: Array<{ channel: NotificationChannel; title: string }> = [];

  const ports: NotificationUseCasePorts = {
    ids: {
      create: vi.fn(() => `id_${notifications.length + channels.length + 1}`),
    },
    clock: {
      now: vi.fn(() => "2026-06-12T00:00:00.000Z"),
    },
    notifications: {
      listChannels: vi.fn(async () => channels),
      createChannel: vi.fn(async (channel) => {
        channels.push(channel);
      }),
      listNotifications: vi.fn(async () => notifications),
      createNotification: vi.fn(async (notification) => {
        notifications.push(notification);
      }),
      markRead: vi.fn(async () => {}),
    },
    delivery: {
      send: vi.fn(async (channel, input) => {
        sent.push({ channel, title: input.title });
      }),
    },
  };

  return { channels, notifications, ports, sent };
}

describe("notification use cases", () => {
  it("creates normalized notification channels", async () => {
    const { channels, ports } = createPorts();

    const channel = await createNotificationChannelUseCase(
      {
        projectId: "project_1",
        name: "  Slack alerts  ",
        channelType: "slack",
        targetUrl: " https://hooks.slack.test/services/demo ",
      },
      ports,
    );

    expect(channel).toEqual(
      expect.objectContaining({
        project_id: "project_1",
        name: "Slack alerts",
        channel_type: "slack",
        target_url: "https://hooks.slack.test/services/demo",
      }),
    );
    expect(channels).toContainEqual(channel);
  });

  it("rejects notification channels without a target URL", async () => {
    const { ports } = createPorts();

    await expect(
      createNotificationChannelUseCase(
        {
          projectId: "project_1",
          channelType: "slack",
          targetUrl: " ",
        },
        ports,
      ),
    ).rejects.toEqual(new ApplicationError("notification_target_url_required", 400));
  });

  it("records notifications and delivers only enabled channels", async () => {
    const enabled = channelFixture({ id: "channel_enabled", enabled: 1 });
    const disabled = channelFixture({ id: "channel_disabled", enabled: 0 });
    const { notifications, ports, sent } = createPorts([enabled, disabled]);

    const notification = await notifyProjectUseCase(
      "project_1",
      {
        title: "Task created",
        body: "Launch checklist was created.",
        source: "app",
      },
      ports,
    );

    expect(notifications).toContainEqual(notification);
    expect(sent).toEqual([{ channel: enabled, title: "Task created" }]);
  });
});

function channelFixture(overrides: Partial<NotificationChannel> = {}): NotificationChannel {
  return {
    id: "channel_1",
    project_id: "project_1",
    name: "Alerts",
    channel_type: "slack",
    target_url: "https://hooks.slack.test/services/demo",
    enabled: 1,
    created_at: "2026-06-12T00:00:00.000Z",
    updated_at: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}
