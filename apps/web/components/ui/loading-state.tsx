import { cn } from "@/lib/utils";

interface LoadingStateProps {
  variant?: "card" | "row" | "text" | "inline";
  lines?: number;
}

export function LoadingState({ variant = "card", lines = 3 }: LoadingStateProps) {
  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2 text-fg-muted">
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (variant === "text") {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-4 rounded animate-skeleton",
              i === lines - 1 ? "w-2/3" : "w-full"
            )}
          />
        ))}
      </div>
    );
  }

  if (variant === "row") {
    return (
      <div className="flex items-center gap-4 rounded-lg border border-edge-subtle bg-surface-muted p-4">
        <div className="h-10 w-10 rounded-lg animate-skeleton" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded animate-skeleton" />
          <div className="h-3 w-1/2 rounded animate-skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-edge-subtle bg-surface-muted p-5">
      <div className="space-y-4">
        <div className="h-3 w-24 rounded animate-skeleton" />
        <div className="h-8 w-32 rounded animate-skeleton" />
        <div className="space-y-2">
          <div className="h-4 w-full rounded animate-skeleton" />
          <div className="h-4 w-3/4 rounded animate-skeleton" />
        </div>
      </div>
    </div>
  );
}
