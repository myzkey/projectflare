import type { Attachment, AttachmentOwnerType } from "../../../../../core/src/domain/attachment";
import type {
  AttachmentOwner,
  AttachmentRepository,
  AttachmentStorage,
  AttachmentStorageObject,
  AttachmentUseCasePorts,
} from "../../../../../core/src/ports/attachments";
import type { Env } from "../env";

const memoryFiles = new Map<string, AttachmentStorageObject>();
const memoryAttachments = new Map<string, Attachment>();

export function createAttachmentUseCasePorts(env: Env): AttachmentUseCasePorts {
  return {
    ids: { create: () => crypto.randomUUID() },
    clock: { now: () => new Date().toISOString() },
    attachments: createD1AttachmentRepository(env),
    storage: createR2AttachmentStorage(env),
  };
}

export function createD1AttachmentRepository(env: Env): AttachmentRepository {
  return {
    findOwner: async (ownerType, ownerId) => {
      if (!env.DB) return demoOwner(ownerType, ownerId);
      if (ownerType === "task") {
        return env.DB.prepare(
          `SELECT p.workspace_id, t.project_id
           FROM tasks t
           JOIN projects p ON p.id = t.project_id
           WHERE t.id = ?`,
        )
          .bind(ownerId)
          .first<AttachmentOwner>();
      }
      return env.DB.prepare(
        `SELECT p.workspace_id, w.project_id
         FROM wiki_pages w
         JOIN projects p ON p.id = w.project_id
         WHERE w.id = ?`,
      )
        .bind(ownerId)
        .first<AttachmentOwner>();
    },
    create: async (attachment) => {
      if (!env.DB) {
        memoryAttachments.set(attachment.id, attachment);
        return;
      }
      try {
        await env.DB.prepare(
          `INSERT INTO attachments (
             id, workspace_id, project_id, object_key, filename, content_type, byte_size,
             attachable_type, attachable_id, created_by_user_id, created_at
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            attachment.id,
            attachment.workspace_id,
            attachment.project_id,
            attachment.object_key,
            attachment.filename,
            attachment.content_type,
            attachment.byte_size,
            attachment.attachable_type,
            attachment.attachable_id,
            attachment.created_by_user_id,
            attachment.created_at,
          )
          .run();
      } catch (error) {
        if (!String(error).includes("project_id")) throw error;
        await env.DB.prepare(
          `INSERT INTO attachments (
             id, workspace_id, object_key, filename, content_type, byte_size,
             attachable_type, attachable_id, created_by_user_id, created_at
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            attachment.id,
            attachment.workspace_id,
            attachment.object_key,
            attachment.filename,
            attachment.content_type,
            attachment.byte_size,
            attachment.attachable_type,
            attachment.attachable_id,
            attachment.created_by_user_id,
            attachment.created_at,
          )
          .run();
      }
    },
    listForOwner: async (ownerType, ownerId) => {
      if (!env.DB) {
        return [...memoryAttachments.values()].filter(
          (attachment) => attachment.attachable_type === ownerType && attachment.attachable_id === ownerId,
        );
      }
      const { results } = await env.DB.prepare(
        `SELECT *
         FROM attachments
         WHERE attachable_type = ? AND attachable_id = ?
         ORDER BY created_at DESC`,
      )
        .bind(ownerType, ownerId)
        .all<Attachment>();
      return results;
    },
    findById: async (id) => {
      if (!env.DB) return memoryAttachments.get(id) ?? null;
      return env.DB.prepare("SELECT * FROM attachments WHERE id = ? LIMIT 1").bind(id).first<Attachment>();
    },
  };
}

export function createR2AttachmentStorage(env: Env): AttachmentStorage {
  return {
    put: async (key, object) => {
      if (!env.FILES) {
        memoryFiles.set(key, object);
        return;
      }
      await env.FILES.put(key, object.body, {
        httpMetadata: { contentType: object.contentType },
        customMetadata: { byteSize: String(object.byteSize) },
      });
    },
    get: async (key) => {
      if (!env.FILES) return memoryFiles.get(key) ?? null;
      const object = await env.FILES.get(key);
      if (!object) return null;
      return {
        body: object.body,
        contentType: object.httpMetadata?.contentType || "application/octet-stream",
        byteSize: object.size,
      };
    },
  };
}

function demoOwner(ownerType: AttachmentOwnerType, ownerId: string): AttachmentOwner | null {
  if (ownerType === "task" && ownerId.startsWith("tsk_")) return { workspace_id: "ws_demo", project_id: "prj_launch" };
  if (ownerType === "wiki_page" && ownerId.startsWith("wiki_")) {
    return { workspace_id: "ws_demo", project_id: "prj_launch" };
  }
  return null;
}
