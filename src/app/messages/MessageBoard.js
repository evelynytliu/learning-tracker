'use client';

import { useState } from 'react';
import { Trash2, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useSaveRunner, SaveStatusPill } from '@/components/SaveStatus';

export default function MessageBoard({ studentId, me, initial }) {
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const supabase = createClient();
  const { status, errMsg, run } = useSaveRunner();

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    let created;
    const ok = await run(async () => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          student_id: studentId,
          author_id: me.id,
          author_name: me.name,
          author_role: me.role,
          content: text.trim(),
        })
        .select()
        .single();
      created = data;
      return error;
    });
    setBusy(false);
    if (!ok) return;
    setMessages((p) => [...p, created]);
    setText('');
  }

  async function remove(id) {
    const prev = messages;
    setMessages((p) => p.filter((m) => m.id !== id));
    await run(
      async () => (await supabase.from('messages').delete().eq('id', id)).error,
      { rollback: () => setMessages(prev) },
    );
  }

  return (
    <div>
      <ul className="mb-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <li className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-400">
            還沒有留言，留一句鼓勵的話吧 💪
          </li>
        )}
        {messages.map((m) => {
          const mine = m.author_id === me.id;
          const isParent = m.author_role === 'parent';
          return (
            <li key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  isParent ? 'bg-amber-50 text-amber-900' : 'bg-indigo-50 text-indigo-900'
                }`}
              >
                <div className="mb-0.5 flex items-center gap-2 text-xs font-semibold opacity-70">
                  {m.author_name}
                  {isParent ? ' 👩' : ' 🧒'}
                  {mine && (
                    <button onClick={() => remove(m.id)} className="text-slate-400 hover:text-red-400">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                <p className="mt-1 text-[10px] opacity-50">
                  {new Date(m.created_at).toLocaleString('zh-TW', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <form onSubmit={send} className="sticky bottom-0 flex gap-2 bg-slate-50 py-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="說點什麼…"
          className="flex-1 rounded-full border px-4 py-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </form>

      <SaveStatusPill status={status} errMsg={errMsg} />
    </div>
  );
}
