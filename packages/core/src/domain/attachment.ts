import { ApplicationError } from "./errors";

export type AttachmentOwnerType = "task" | "wiki_page";

export type Attachment = {
  id: string;
  workspace_id: string;
  project_id: string;
  object_key: string;
  filename: string;
  content_type: string;
  byte_size: number;
  attachable_type: AttachmentOwnerType;
  attachable_id: string;
  created_by_user_id: string | null;
  created_at: string;
};

export type PublicAttachment = Attachment & {
  url: string;
  markdown: string;
};

export function assertMediaAttachment(contentType: string, byteSize: number) {
  const isImage = contentType.startsWith("image/");
  const isVideo = contentType.startsWith("video/");
  if (!isImage && !isVideo) throw new ApplicationError("attachment_media_required", 400);
  if (byteSize <= 0) throw new ApplicationError("attachment_empty", 400);
  const maxBytes = isVideo ? 32 * 1024 * 1024 : 8 * 1024 * 1024;
  if (byteSize > maxBytes) throw new ApplicationError("attachment_too_large", 413);
}

export function attachmentObjectKey(input: {
  workspaceId: string;
  projectId: string;
  ownerType: AttachmentOwnerType;
  ownerId: string;
  attachmentId: string;
  filename: string;
}) {
  const safeName = input.filename.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "upload";
  return [input.workspaceId, input.projectId, input.ownerType, input.ownerId, `${input.attachmentId}-${safeName}`].join(
    "/",
  );
}

export function publicAttachment(attachment: Attachment): PublicAttachment {
  const url = `/api/attachments/${attachment.id}/content`;
  const markdown = attachment.content_type.startsWith("video/")
    ? `[${attachment.filename}](${url})`
    : `![${attachment.filename}](${url})`;
  return {
    ...attachment,
    url,
    markdown,
  };
}
