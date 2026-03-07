interface PositioningPreviewProps {
  headline?: string;
  subheadline?: string;
  statement?: string;
  benefits?: string[];
}

export function PositioningPreview({
  headline,
  subheadline,
  statement,
  benefits
}: PositioningPreviewProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-edge-subtle bg-surface-muted">
      {/* Accent gradient top border */}
      <div className="h-1 w-full bg-gradient-to-r from-accent via-purple-500 to-pink-500" />

      <div className="p-6">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-fg-faint">
          Positioning Preview
        </p>

        <h3 className="mt-4 text-2xl font-bold text-fg-primary">
          {headline ?? "No headline yet"}
        </h3>

        {subheadline && (
          <p className="mt-2 text-lg text-fg-secondary">{subheadline}</p>
        )}

        {statement && (
          <p className="mt-4 text-sm leading-relaxed text-fg-muted">{statement}</p>
        )}

        {benefits && benefits.length > 0 && (
          <ul className="mt-6 space-y-2">
            {benefits.map((benefit, index) => (
              <li
                key={benefit}
                className="flex items-start gap-2 text-sm text-fg-secondary animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {benefit}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
