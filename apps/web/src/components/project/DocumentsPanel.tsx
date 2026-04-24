import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
} from '@spex/ui';
import { FileText, Folder, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthContext';
import { supabase } from '../../lib/supabase';

type DocFolder =
  | 'plans'
  | 'consultants'
  | 'contract'
  | 'invoices'
  | 'photos'
  | 'meetings'
  | 'handover'
  | 'other';

const FOLDERS: DocFolder[] = [
  'plans',
  'consultants',
  'contract',
  'invoices',
  'photos',
  'meetings',
  'handover',
  'other',
];

interface DocRow {
  id: string;
  drive_file_id: string | null; // repurposed: storage object path
  filename: string;
  folder_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  uploader: { full_name: string } | null;
}

function formatSize(bytes: number | null): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function sanitize(name: string): string {
  return name.replace(/[^\w.\-א-ת ]/g, '_').replace(/\s+/g, '_');
}

export function DocumentsPanel({
  projectId,
  canWrite,
}: {
  projectId: string;
  canWrite: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [rows, setRows] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadFolder, setUploadFolder] = useState<DocFolder>('plans');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function refresh() {
    const { data, error } = await supabase
      .from('documents')
      .select(
        'id, drive_file_id, filename, folder_path, mime_type, size_bytes, created_at, uploader:user_profiles!documents_uploaded_by_id_fkey(full_name)',
      )
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setRows((data as unknown as DocRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    const key = `${projectId}/${Date.now()}-${sanitize(file.name)}`;
    const { error: upErr } = await supabase.storage
      .from('project-docs')
      .upload(key, file, { contentType: file.type || undefined });
    if (upErr) {
      setError(upErr.message);
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const { error: insErr } = await supabase.from('documents').insert({
      project_id: projectId,
      drive_file_id: key,
      filename: file.name,
      folder_path: uploadFolder,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by_id: user?.id ?? null,
    });
    if (insErr) {
      // best-effort: try to remove the orphan object
      void supabase.storage.from('project-docs').remove([key]);
      setError(insErr.message);
    } else {
      await refresh();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function download(doc: DocRow) {
    if (!doc.drive_file_id) return;
    const { data, error: sigErr } = await supabase.storage
      .from('project-docs')
      .createSignedUrl(doc.drive_file_id, 60);
    if (sigErr || !data) {
      setError(sigErr?.message ?? 'signed url failed');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  async function remove(doc: DocRow) {
    if (!confirm(t('documents.confirmDelete'))) return;
    if (doc.drive_file_id) {
      await supabase.storage.from('project-docs').remove([doc.drive_file_id]);
    }
    const { error: delErr } = await supabase.from('documents').delete().eq('id', doc.id);
    if (delErr) setError(delErr.message);
    else await refresh();
  }

  const dateFmt = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">{t('documents.title')}</CardTitle>
        {canWrite && (
          <div className="flex items-center gap-2">
            <select
              value={uploadFolder}
              onChange={(e) => setUploadFolder(e.target.value as DocFolder)}
              disabled={uploading}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              {FOLDERS.map((f) => (
                <option key={f} value={f}>
                  {t(`documents.folders.${f}`)}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 me-1.5" />
              {uploading ? t('documents.uploading') : t('documents.upload')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => void onFileChange(e)}
              className="hidden"
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {error && (
          <p className="text-sm text-destructive px-6 pt-3" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground p-6 text-center">{t('common.loading')}</p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Folder}
            title={t('documents.empty')}
            cta={
              canWrite
                ? { label: t('documents.upload'), onClick: () => fileInputRef.current?.click() }
                : undefined
            }
          />
        ) : (
          <div className="divide-y">
            {rows.map((doc) => (
              <div key={doc.id} className="px-6 py-3 flex items-center gap-3 flex-wrap">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{doc.filename}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatSize(doc.size_bytes)}
                    {doc.uploader && <span> · {doc.uploader.full_name}</span>}
                    <span> · {dateFmt.format(new Date(doc.created_at))}</span>
                  </div>
                </div>
                {doc.folder_path && (
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                    {t(`documents.folders.${doc.folder_path}`, {
                      defaultValue: doc.folder_path,
                    })}
                  </span>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => void download(doc)}>
                    {t('documents.download')}
                  </Button>
                  {canWrite && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => void remove(doc)}
                    >
                      {t('common.delete')}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
