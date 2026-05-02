import { supabase } from './supabase';

export type DocFolder =
  | 'plans'
  | 'consultants'
  | 'contract'
  | 'invoices'
  | 'photos'
  | 'meetings'
  | 'handover'
  | 'other';

interface UploadDocumentArgs {
  file: File;
  projectId: string;
  folder: DocFolder;
  userId: string | null;
  chapterId?: string | null;
}

export interface UploadedDocument {
  id: string;
  drive_file_id: string;
  filename: string;
  folder_path: string;
  mime_type: string | null;
  size_bytes: number;
  tags: string[] | null;
}

function sanitize(name: string): string {
  return name.replace(/[^\w.\-א-ת ]/g, '_').replace(/\s+/g, '_');
}

export async function uploadDocument({
  file,
  projectId,
  folder,
  userId,
  chapterId,
}: UploadDocumentArgs): Promise<UploadedDocument> {
  const key = `${projectId}/${Date.now()}-${sanitize(file.name)}`;
  const { error: upErr } = await supabase.storage
    .from('project-docs')
    .upload(key, file, { contentType: file.type || undefined });
  if (upErr) throw upErr;

  const tags = chapterId ? [`chapter:${chapterId}`] : null;

  const { data, error: insErr } = await supabase
    .from('documents')
    .insert({
      project_id: projectId,
      drive_file_id: key,
      filename: file.name,
      folder_path: folder,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by_id: userId,
      tags,
    })
    .select('id, drive_file_id, filename, folder_path, mime_type, size_bytes, tags')
    .single();

  if (insErr) {
    // Best-effort: remove the orphan storage object so we don't leave junk behind
    void supabase.storage.from('project-docs').remove([key]);
    throw insErr;
  }

  return data as UploadedDocument;
}
