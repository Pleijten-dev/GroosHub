import { getDbConnection } from '../connection';

export interface FileUpload {
  id: string;
  user_id: number;
  project_id: string | null;
  chat_id: string | null;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size_bytes: number;
  mime_type: string;
  file_category: string;
  storage_provider: string;
  storage_url: string;
  is_public: boolean;
  access_level: string;
  processing_status: string;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export async function getProjectFiles(projectId: string): Promise<FileUpload[]> {
  const db = getDbConnection();
  const result = await db`
    SELECT id, user_id, project_id, chat_id,
           filename, original_filename, file_path,
           file_size_bytes, mime_type, file_category,
           storage_provider, storage_url,
           is_public, access_level, processing_status,
           metadata, created_at, updated_at, deleted_at
    FROM file_uploads
    WHERE project_id = ${projectId}
    AND deleted_at IS NULL
    ORDER BY created_at DESC
  `;
  return result as FileUpload[];
}

export async function getChatFiles(chatId: string): Promise<FileUpload[]> {
  const db = getDbConnection();
  const result = await db`
    SELECT id, user_id, project_id, chat_id,
           filename, original_filename, file_path,
           file_size_bytes, mime_type, file_category,
           storage_provider, storage_url,
           is_public, access_level, processing_status,
           metadata, created_at, updated_at, deleted_at
    FROM file_uploads
    WHERE chat_id = ${chatId}
    AND deleted_at IS NULL
    ORDER BY created_at DESC
  `;
  return result as FileUpload[];
}

export async function getUserFiles(userId: number): Promise<FileUpload[]> {
  const db = getDbConnection();
  const result = await db`
    SELECT id, user_id, project_id, chat_id,
           filename, original_filename, file_path,
           file_size_bytes, mime_type, file_category,
           storage_provider, storage_url,
           is_public, access_level, processing_status,
           metadata, created_at, updated_at, deleted_at
    FROM file_uploads
    WHERE user_id = ${userId}
    AND deleted_at IS NULL
    ORDER BY created_at DESC
  `;
  return result as FileUpload[];
}

export async function getFileById(fileId: string): Promise<FileUpload | null> {
  const db = getDbConnection();
  const result = await db`
    SELECT id, user_id, project_id, chat_id,
           filename, original_filename, file_path,
           file_size_bytes, mime_type, file_category,
           storage_provider, storage_url,
           is_public, access_level, processing_status,
           metadata, created_at, updated_at, deleted_at
    FROM file_uploads
    WHERE id = ${fileId}
    AND deleted_at IS NULL
    LIMIT 1
  `;
  return result.length > 0 ? (result[0] as FileUpload) : null;
}
