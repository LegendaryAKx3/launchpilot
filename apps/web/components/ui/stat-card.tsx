import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
}

export function StatCard({ label, value, trend, icon }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-edge-subtle bg-surface-muted p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-edge-muted hover:shadow-lg">
      {/* Subtle gradient overlay */}
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.02] to-transparent" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-fg-muted">
            {label}
          </p>
          <p className="mt-3 font-mono text-3xl font-bold text-fg-primary">
            {value}
          </p>

          {trend && (
            <div
              className={cn(
                "mt-2 flex items-center gap-1 text-xs font-medium",
                trend === "up" && "text-emerald-400",
                trend === "down" && "text-red-400",
                trend === "neutral" && "text-fg-muted"
              )}
            >
              {trend === "up" && (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
              {trend === "down" && (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              {trend === "neutral" && (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                </svg>
              )}
              <span>
                {trend === "up" && "+12%"}
                {trend === "down" && "-5%"}
                {trend === "neutral" && "No change"}
              </span>
            </div>
          )}
        </div>

        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-elevated text-fg-muted transition-colors group-hover:bg-accent/10 group-hover:text-accent">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
