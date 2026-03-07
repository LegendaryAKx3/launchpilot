interface MemoryItem {
  key: string;
  value: string;
}

export function MemoryHighlightsCard({ items }: { items: MemoryItem[] }) {
  return (
    <div className="rounded-xl border border-edge-subtle bg-surface-muted p-5">
      <div className="flex items-center gap-2">
        <svg className="h-4 w-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <h3 className="text-sm font-semibold text-fg-primary">Memory Highlights</h3>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-fg-muted">No memory items yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item, index) => (
            <li
              key={item.key}
              className="rounded-lg border border-edge-subtle bg-surface-elevated p-3 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <p className="font-mono text-xs uppercase tracking-wider text-fg-faint">
                {item.key}
              </p>
              <p className="mt-1 text-sm text-fg-secondary">{item.value}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
