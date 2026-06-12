import type { Attachment, AttachmentOwnerType } from "../domain/attachment";

export type AttachmentOwner = {
  workspace_id: string;
  project_id: string;
};

export type AttachmentRepository = {
  findOwner(ownerType: AttachmentOwnerType, ownerId: string): Promise<AttachmentOwner | null>;
  create(attachment: Attachment): Promise<void>;
  listForOwner(ownerType: AttachmentOwnerType, ownerId: string): Promise<Attachment[]>;
  findById(id: string): Promise<Attachment | null>;
};

export type AttachmentStorageObject = {
  body: ReadableStream | ArrayBuffer;
  contentType: string;
  byteSize: number;
};

export type AttachmentStorage = {
  put(key: string, object: AttachmentStorageObject): Promise<void>;
  get(key: string): Promise<AttachmentStorageObject | null>;
};

export type AttachmentUseCasePorts = {
  ids: {
    create(): string;
  };
  clock: {
    now(): string;
  };
  attachments: AttachmentRepository;
  storage: AttachmentStorage;
};
