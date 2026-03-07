import { cn } from "@/lib/utils";

interface PainPoint {
  label: string;
  description?: string;
  severity?: "low" | "medium" | "high";
}

export function PainPointMap({ items }: { items: PainPoint[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-edge-subtle bg-surface-subtle/50 p-6 text-center">
        <p className="text-sm text-fg-muted">No pain points identified yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={item.label}
          className="group flex gap-3 rounded-xl border border-edge-subtle bg-surface-muted p-4 transition-all duration-200 hover:border-edge-muted animate-slide-up"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {/* Severity indicator */}
          <div
            className={cn(
              "mt-1 h-2 w-2 shrink-0 rounded-full",
              item.severity === "high" && "bg-red-400",
              item.severity === "medium" && "bg-amber-400",
              (!item.severity || item.severity === "low") && "bg-fg-faint"
            )}
          />

          <div className="flex-1">
            <p className="font-medium text-fg-primary">{item.label}</p>
            {item.description && (
              <p className="mt-1 text-sm text-fg-muted opacity-80 transition-opacity group-hover:opacity-100">
                {item.description}
              </p>
            )}
          </div>

          {item.severity && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                item.severity === "high" && "bg-red-400/10 text-red-400",
                item.severity === "medium" && "bg-amber-400/10 text-amber-400",
                item.severity === "low" && "bg-fg-faint/10 text-fg-muted"
              )}
            >
              {item.severity}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
