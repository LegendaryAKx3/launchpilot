"use client";

import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";

export interface Plan {
  id: string;
  positioning_version_id?: string | null;
  primary_channel?: string;
  secondary_channels?: string[];
  kpis?: string[];
  status: string;
}

export interface Task {
  id: string;
  launch_plan_id: string;
  day_number?: number;
  title: string;
  description?: string;
  status?: string;
  priority?: number;
}

interface PlansListProps {
  plans: Plan[];
  tasks: Task[];
  selectedPlanId: string | null;
  onSelectPlan: (planId: string | null) => void;
}

export function PlansList({ plans, tasks, selectedPlanId, onSelectPlan }: PlansListProps) {
  const getTasksForPlan = (planId: string) => {
    return tasks.filter((task) => task.launch_plan_id === planId);
  };

  const getCompletedTasks = (planId: string) => {
    return getTasksForPlan(planId).filter(
      (task) => task.status === "completed" || task.status === "succeeded"
    );
  };

  if (plans.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-elevated">
          <svg className="h-8 w-8 text-fg-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-fg-primary">No launch plans yet</h3>
        <p className="mt-1 text-xs text-fg-muted">
          Use the chat to create your first 7-day launch plan
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-edge-subtle px-4 py-3">
        <h3 className="text-sm font-semibold text-fg-primary">Launch Plans</h3>
        <p className="mt-0.5 text-xs text-fg-muted">{plans.length} plan{plans.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-2">
          {plans.map((plan) => {
            const planTasks = getTasksForPlan(plan.id);
            const completedTasks = getCompletedTasks(plan.id);
            const progress = planTasks.length > 0 ? Math.round((completedTasks.length / planTasks.length) * 100) : 0;

            return (
              <button
                key={plan.id}
                onClick={() => onSelectPlan(selectedPlanId === plan.id ? null : plan.id)}
                className={cn(
                  "w-full rounded-xl border p-4 text-left transition-all",
                  selectedPlanId === plan.id
                    ? "border-accent bg-accent/5 shadow-sm"
                    : "border-edge-subtle bg-surface-elevated hover:border-edge-muted"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-fg-primary truncate">
                        {plan.primary_channel || "Launch Plan"}
                      </span>
                      <StatusBadge status={plan.status} />
                    </div>
                    {plan.secondary_channels && plan.secondary_channels.length > 0 && (
                      <p className="mt-1 text-xs text-fg-muted truncate">
                        + {plan.secondary_channels.join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-fg-muted">
                      {completedTasks.length}/{planTasks.length} tasks
                    </span>
                    <span className="text-fg-faint">{progress}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* KPIs preview */}
                {plan.kpis && plan.kpis.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {plan.kpis.slice(0, 2).map((kpi, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-fg-muted"
                      >
                        {kpi}
                      </span>
                    ))}
                    {plan.kpis.length > 2 && (
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-fg-faint">
                        +{plan.kpis.length - 2} more
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
