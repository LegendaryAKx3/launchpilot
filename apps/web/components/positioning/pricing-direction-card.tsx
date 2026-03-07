interface PricingDirectionCardProps {
  value?: string;
}

export function PricingDirectionCard({ value }: PricingDirectionCardProps) {
  return (
    <div className="rounded-xl border border-edge-subtle bg-surface-muted p-5">
      <div className="flex items-center gap-2">
        <svg className="h-4 w-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-sm font-semibold text-fg-primary">Pricing Direction</h3>
      </div>

      <div className="mt-4">
        {value ? (
          <p className="text-lg font-medium text-accent">{value}</p>
        ) : (
          <p className="text-sm text-fg-muted">Not selected</p>
        )}
      </div>
    </div>
  );
}
