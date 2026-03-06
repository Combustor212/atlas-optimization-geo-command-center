interface MessagePreviewProps {
  message: string | null
}

/**
 * Uses native <details> so it works without client JS - click to expand and see full message.
 */
export function MessagePreview({ message }: MessagePreviewProps) {
  const text = message || '—'

  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:underline max-w-xs select-none [&::-webkit-details-marker]:hidden [&::marker]:hidden">
        <span className="line-clamp-2">{text}</span>
        <span className="block mt-0.5 text-xs text-[var(--muted)]/80 group-open:hidden">Click to view full message</span>
      </summary>
      <div className="mt-2 p-3 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-sm text-[var(--foreground)] whitespace-pre-wrap max-w-md shadow-lg">
        {text}
      </div>
    </details>
  )
}
