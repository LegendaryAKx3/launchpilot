import { cn } from "@/lib/utils";

interface WedgeCardProps {
  wedge: {
    label: string;
    description?: string;
    score?: number;
  };
  onUse?: () => void;
  selected?: boolean;
}

export function WedgeCard({ wedge, onUse, selected }: WedgeCardProps) {
  const score = wedge.score ?? 0;

  return (
    <div
      className={cn(
        "group relative rounded-xl border p-4 transition-all duration-200",
        selected
          ? "border-accent bg-accent-subtle shadow-lg shadow-accent/10"
          : "border-edge-subtle bg-surface-muted hover:border-edge-muted"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-medium text-fg-primary">{wedge.label}</p>
          {wedge.description && (
            <p className="mt-1 text-sm text-fg-muted">{wedge.description}</p>
          )}
        </div>

        {/* Score badge */}
        <div className="ml-3 flex flex-col items-end">
          <span className="font-mono text-lg font-bold text-accent">
            {(score * 100).toFixed(0)}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-faint">
            score
          </span>
        </div>
      </div>

      {/* Score bar */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-500"
          style={{ width: `${score * 100}%` }}
        />
      </div>

      {onUse && (
        <button
          onClick={onUse}
          className="mt-4 w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white opacity-0 transition-all hover:bg-accent-hover group-hover:opacity-100"
        >
          Use for Positioning
        </button>
      )}
    </div>
  );
}
