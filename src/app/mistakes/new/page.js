'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SUBJECTS, MISTAKE_REASONS, cn } from '@/lib/utils';

export default function NewMistakePage() {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = subject && reason && (description || file);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();

    let image_url = null;
    if (file) {
      const { data: { user } } = await supabase.auth.getUser();
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase
        .storage
        .from('mistake-photos')
        .upload(path, file);
      if (upErr) {
        setError(upErr.message);
        setSaving(false);
        return;
      }
      image_url = path;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { error: insertErr } = await supabase.from('mistakes').insert({
      user_id: user.id,
      subject,
      reason,
      description: description || null,
      image_url,
    });

    setSaving(false);
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    router.push('/mistakes');
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-md px-5 pb-12 pt-6">
      <h1 className="text-2xl font-bold">新增錯題</h1>
      <p className="mt-1 text-sm text-gray-500">記下原因比寫對題目更重要</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
        <section>
          <label className="mb-2 block text-sm font-medium">科目</label>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSubject(s)}
                className={cn(
                  'rounded-full border-2 px-4 py-2 text-sm',
                  subject === s
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        <section>
          <label className="mb-2 block text-sm font-medium">
            錯誤原因 <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {MISTAKE_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={cn(
                  'rounded-full border-2 px-4 py-2 text-sm',
                  reason === r
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 bg-white',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </section>

        <section>
          <label className="mb-2 block text-sm font-medium">題目（文字）</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="可以直接打字，或下面拍照上傳"
            className="w-full rounded-xl border px-4 py-3"
          />
        </section>

        <section>
          <label className="flex items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-4 py-6 text-sm text-gray-600">
            <Camera size={20} />
            <span>{file ? file.name : '拍照 / 選圖片上傳'}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit || saving}
          className="rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-40"
        >
          {saving ? '儲存中…' : '完成'}
        </button>
      </form>
    </main>
  );
}
