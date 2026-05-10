'use client';
import { useState } from 'react';
import { FEEDBACK_TAGS } from '@/lib/feedback-tags';

export type FeedbackState = {
  rating: 'good' | 'bad';
  tags: string[];
  comment: string | null;
} | null;

export function MessageFeedback({
  messageId,
  initial,
}: {
  messageId: string;
  initial: FeedbackState;
}) {
  const [fb, setFb] = useState<FeedbackState>(initial);
  const [expanded, setExpanded] = useState(false);
  const [draftTags, setDraftTags] = useState<string[]>(initial?.tags ?? []);
  const [draftComment, setDraftComment] = useState(initial?.comment ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rate(rating: 'good' | 'bad') {
    setSaving(true);
    setError(null);
    const res = await fetch('/api/message-feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message_id: messageId,
        rating,
        tags: draftTags,
        comment: draftComment || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError('Kaydedilemedi');
      return;
    }
    setFb({ rating, tags: draftTags, comment: draftComment || null });
    setExpanded(true);
  }

  async function saveDetails() {
    if (!fb) return;
    setSaving(true);
    setError(null);
    const res = await fetch('/api/message-feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message_id: messageId,
        rating: fb.rating,
        tags: draftTags,
        comment: draftComment || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError('Kaydedilemedi');
      return;
    }
    setFb({ rating: fb.rating, tags: draftTags, comment: draftComment || null });
    setExpanded(false);
  }

  async function clearFeedback() {
    setSaving(true);
    const res = await fetch(`/api/message-feedback?message_id=${messageId}`, {
      method: 'DELETE',
    });
    setSaving(false);
    if (res.ok) {
      setFb(null);
      setDraftTags([]);
      setDraftComment('');
      setExpanded(false);
    }
  }

  function toggleTag(key: string) {
    setDraftTags((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
  }

  if (!fb && !expanded) {
    return (
      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
        <button
          onClick={() => rate('good')}
          disabled={saving}
          className="hover:bg-green-50 px-1.5 py-0.5 rounded transition"
          title="Gerçekçi yanıt"
        >
          👍
        </button>
        <button
          onClick={() => rate('bad')}
          disabled={saving}
          className="hover:bg-red-50 px-1.5 py-0.5 rounded transition"
          title="Sorunlu yanıt"
        >
          👎
        </button>
        {error && <span className="text-red-600">{error}</span>}
      </div>
    );
  }

  if (fb && !expanded) {
    return (
      <div className="mt-1 flex items-center gap-2 text-xs text-gray-600 flex-wrap">
        <span>{fb.rating === 'good' ? '👍' : '👎'}</span>
        {fb.tags.map((t) => {
          const tag = FEEDBACK_TAGS.find((x) => x.key === t);
          return tag ? (
            <span
              key={t}
              className={`px-1.5 py-0.5 rounded ${
                tag.sentiment === 'good' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}
            >
              {tag.label}
            </span>
          ) : null;
        })}
        {fb.comment && <span className="italic text-gray-500">"{fb.comment}"</span>}
        <button
          onClick={() => setExpanded(true)}
          className="underline ml-1 hover:text-gray-900"
        >
          düzenle
        </button>
      </div>
    );
  }

  // expanded form
  const visibleTags = fb
    ? FEEDBACK_TAGS.filter((t) => t.sentiment === (fb.rating === 'good' ? 'good' : 'bad'))
    : FEEDBACK_TAGS;

  return (
    <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs space-y-2">
      {!fb && (
        <div className="flex gap-2">
          <button
            onClick={() => rate('good')}
            disabled={saving}
            className="px-2 py-1 bg-green-100 rounded hover:bg-green-200"
          >
            👍 Gerçekçi
          </button>
          <button
            onClick={() => rate('bad')}
            disabled={saving}
            className="px-2 py-1 bg-red-100 rounded hover:bg-red-200"
          >
            👎 Sorunlu
          </button>
        </div>
      )}
      {fb && (
        <div className="flex items-center gap-2">
          <span className="font-medium">{fb.rating === 'good' ? '👍' : '👎'}</span>
          <button onClick={clearFeedback} className="ml-auto underline text-gray-500">
            sil
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-1">
        {visibleTags.map((t) => {
          const active = draftTags.includes(t.key);
          return (
            <button
              key={t.key}
              onClick={() => toggleTag(t.key)}
              className={`px-1.5 py-0.5 rounded border ${
                active
                  ? t.sentiment === 'good'
                    ? 'bg-green-100 border-green-300'
                    : 'bg-red-100 border-red-300'
                  : 'bg-white border-gray-300 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <textarea
        value={draftComment}
        onChange={(e) => setDraftComment(e.target.value)}
        placeholder="Yorum (ops.)"
        rows={2}
        className="w-full border rounded p-1.5 text-xs"
      />
      {fb && (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              setDraftTags(fb.tags);
              setDraftComment(fb.comment ?? '');
              setExpanded(false);
            }}
            className="px-2 py-1 border rounded"
          >
            Vazgeç
          </button>
          <button
            onClick={saveDetails}
            disabled={saving}
            className="px-2 py-1 bg-black text-white rounded"
          >
            {saving ? '...' : 'Kaydet'}
          </button>
        </div>
      )}
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
