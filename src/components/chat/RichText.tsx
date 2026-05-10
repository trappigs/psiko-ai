/**
 * Renders danışan content with `*body language*` markers as italic muted spans.
 * Anything outside the asterisks renders as normal text.
 */
const PATTERN = /\*([^*\n]+)\*/g;

export function RichText({ text, className = '' }: { text: string; className?: string }) {
  const parts: { kind: 'text' | 'cue'; value: string }[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(PATTERN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push({ kind: 'text', value: text.slice(lastIndex, start) });
    }
    parts.push({ kind: 'cue', value: match[1] });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ kind: 'text', value: text.slice(lastIndex) });
  }
  if (parts.length === 0) {
    return <span className={`whitespace-pre-wrap ${className}`}>{text}</span>;
  }
  return (
    <span className={`whitespace-pre-wrap ${className}`}>
      {parts.map((p, i) =>
        p.kind === 'cue' ? (
          <em key={i} className="text-gray-500 not-italic font-light bg-gray-50 rounded px-1 mx-0.5 text-[0.92em]">
            {p.value}
          </em>
        ) : (
          <span key={i}>{p.value}</span>
        )
      )}
    </span>
  );
}
