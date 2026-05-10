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
      <div className="flex items-center gap-1 text-xs text-muted">
        <button
          onClick={() => rate('good')}
          disabled={saving}
          className="hover:text-success px-1.5 py-0.5 rounded transition-colors"
          title="Gerçekçi yanıt"
        >
          👍
        </button>
        <button
          onClick={() => rate('bad')}
          disabled={saving}
          className="hover:text-danger px-1.5 py-0.5 rounded transition-colors"
          title="Sorunlu yanıt"
        >
          👎
        </button>
        {error && <span className="text-danger ml-1">{error}</span>}
      </div>
    );
  }

  if (fb && !expanded) {
    return (
      <div className="flex items-center gap-2 text-xs text-ink-soft flex-wrap">
        <span className={fb.rating === 'good' ? 'text-success' : 'text-danger'}>
          {fb.rating === 'good' ? '👍' : '👎'}
        </span>
        {fb.tags.map((t) => {
          const tag = FEEDBACK_TAGS.find((x) => x.key === t);
          return tag ? (
            <span
              key={t}
              className={`px-1.5 py-0.5 rounded text-[11px] ${
                tag.sentiment === 'good'
                  ? 'bg-paper-deep text-success'
                  : 'bg-accent-soft text-danger'
              }`}
            >
              {tag.label}
            </span>
          ) : null;
        })}
        {fb.comment && <span className="font-display-italic text-muted">"{fb.comment}"</span>}
        <button onClick={() => setExpanded(true)} className="btn-quiet text-[11px] ml-1">
          düzenle
        </button>
      </div>
    );
  }

  const visibleTags = fb
    ? FEEDBACK_TAGS.filter((t) => t.sentiment === (fb.rating === 'good' ? 'good' : 'bad'))
    : FEEDBACK_TAGS;

  return (
    <div className="surface-deep p-3 text-xs space-y-3">
      {!fb && (
        <div className="flex gap-2">
          <button
            onClick={() => rate('good')}
            disabled={saving}
            className="px-3 py-1.5 rounded-full border border-rule hover:border-success hover:text-success transition-colors"
          >
            👍 Gerçekçi
          </button>
          <button
            onClick={() => rate('bad')}
            disabled={saving}
            className="px-3 py-1.5 rounded-full border border-rule hover:border-danger hover:text-danger transition-colors"
          >
            👎 Sorunlu
          </button>
        </div>
      )}
      {fb && (
        <div className="flex items-center gap-2">
          <span className={`font-medium ${fb.rating === 'good' ? 'text-success' : 'text-danger'}`}>
            {fb.rating === 'good' ? '👍 Gerçekçi' : '👎 Sorunlu'}
          </span>
          <button onClick={clearFeedback} className="ml-auto btn-quiet text-[11px]">
            sil
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {visibleTags.map((t) => {
          const active = draftTags.includes(t.key);
          return (
            <button
              key={t.key}
              onClick={() => toggleTag(t.key)}
              className={`px-2 py-0.5 rounded-full border text-[11px] transition-colors ${
                active
                  ? t.sentiment === 'good'
                    ? 'bg-success text-paper border-success'
                    : 'bg-danger text-paper border-danger'
                  : 'bg-paper border-rule hover:border-ink'
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
        placeholder="Yorum (opsiyonel)"
        rows={2}
        className="w-full text-xs"
      />
      {fb && (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              setDraftTags(fb.tags);
              setDraftComment(fb.comment ?? '');
              setExpanded(false);
            }}
            className="btn-outline text-xs px-3 py-1"
          >
            Vazgeç
          </button>
          <button
            onClick={saveDetails}
            disabled={saving}
            className="btn-primary text-xs px-3 py-1"
          >
            {saving ? '...' : 'Kaydet'}
          </button>
        </div>
      )}
      {error && <p className="text-danger">{error}</p>}
    </div>
  );
}
