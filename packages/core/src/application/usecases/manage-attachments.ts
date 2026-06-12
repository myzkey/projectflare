import {
  type Attachment,
  type AttachmentOwnerType,
  assertMediaAttachment,
  attachmentObjectKey,
  type PublicAttachment,
  publicAttachment,
} from "../../domain/attachment";
import { ApplicationError } from "../../domain/errors";
import type { AttachmentUseCasePorts } from "../../ports/attachments";

export async function uploadAttachmentUseCase(
  input: {
    ownerType: AttachmentOwnerType;
    ownerId: string;
    filename: string;
    contentType: string;
    byteSize: number;
    body: ReadableStream | ArrayBuffer;
    createdByUserId: string | null;
  },
  ports: AttachmentUseCasePorts,
): Promise<PublicAttachment> {
  assertMediaAttachment(input.contentType, input.byteSize);
  const owner = await ports.attachments.findOwner(input.ownerType, input.ownerId);
  if (!owner) throw new ApplicationError("attachment_owner_not_found", 404);

  const id = ports.ids.create();
  const objectKey = attachmentObjectKey({
    workspaceId: owner.workspace_id,
    projectId: owner.project_id,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    attachmentId: id,
    filename: input.filename,
  });
  const attachment: Attachment = {
    id,
    workspace_id: owner.workspace_id,
    project_id: owner.project_id,
    object_key: objectKey,
    filename: input.filename.trim() || "upload",
    content_type: input.contentType,
    byte_size: input.byteSize,
    attachable_type: input.ownerType,
    attachable_id: input.ownerId,
    created_by_user_id: input.createdByUserId,
    created_at: ports.clock.now(),
  };

  await ports.storage.put(objectKey, {
    body: input.body,
    contentType: input.contentType,
    byteSize: input.byteSize,
  });
  await ports.attachments.create(attachment);
  return publicAttachment(attachment);
}

export async function listAttachmentsUseCase(
  input: { ownerType: AttachmentOwnerType; ownerId: string },
  ports: AttachmentUseCasePorts,
): Promise<PublicAttachment[]> {
  const attachments = await ports.attachments.listForOwner(input.ownerType, input.ownerId);
  return attachments.map(publicAttachment);
}

export async function getAttachmentContentUseCase(
  id: string,
  ports: AttachmentUseCasePorts,
): Promise<{ attachment: Attachment; body: ReadableStream | ArrayBuffer; contentType: string; byteSize: number }> {
  const attachment = await ports.attachments.findById(id);
  if (!attachment) throw new ApplicationError("attachment_not_found", 404);
  const object = await ports.storage.get(attachment.object_key);
  if (!object) throw new ApplicationError("attachment_content_not_found", 404);
  return {
    attachment,
    body: object.body,
    contentType: object.contentType || attachment.content_type,
    byteSize: object.byteSize || attachment.byte_size,
  };
}
