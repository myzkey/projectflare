import type { NotificationChannel } from "../../../../../core/src/domain/notification";
import type { NotificationDelivery, ProjectNotificationInput } from "../../../../../core/src/ports/notifications";

export function createNotificationDelivery(): NotificationDelivery {
  return {
    send: async (channel, input) => {
      const payload = notificationPayloadFor(channel, input);

      try {
        await fetch(channel.target_url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        console.warn("Notification channel delivery failed", channel.id, error);
      }
    },
  };
}

export function notificationPayloadFor(
  channel: Pick<NotificationChannel, "channel_type">,
  input: ProjectNotificationInput,
) {
  if (channel.channel_type === "slack") {
    return {
      text: `${input.title}: ${input.body}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${escapeSlackText(input.title)}*\n${escapeSlackText(input.body)}`,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `ProjectFlare / ${escapeSlackText(input.source)}`,
            },
          ],
        },
      ],
    };
  }

  return {
    text: `${input.title}: ${input.body}`,
    title: input.title,
    body: input.body,
    source: input.source,
    projectflare: true,
  };
}

function escapeSlackText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
