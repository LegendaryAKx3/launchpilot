"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";

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

interface PlanViewProps {
  plan: Plan | null;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskToggle: (taskId: string) => void;
}

export function PlanView({ plan, tasks, onTaskClick, onTaskToggle }: PlanViewProps) {
  const planTasks = useMemo(() => {
    if (!plan) return [];
    return tasks.filter((task) => task.launch_plan_id === plan.id);
  }, [tasks, plan]);

  const tasksByDay = useMemo(() => {
    const grouped: Record<number, Task[]> = {};
    planTasks.forEach((task) => {
      const day = task.day_number ?? 1;
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(task);
    });
    return grouped;
  }, [planTasks]);

  const completedCount = planTasks.filter(
    (t) => t.status === "completed" || t.status === "succeeded"
  ).length;

  const progress = planTasks.length > 0 ? Math.round((completedCount / planTasks.length) * 100) : 0;

  // Empty state
  if (!plan) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-elevated">
          <svg className="h-10 w-10 text-fg-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-fg-primary">No launch plan yet</h3>
        <p className="mt-2 max-w-sm text-sm text-fg-muted">
          Send a message to create your 7-day launch plan with daily targets
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Overview Section - Clean */}
      <div className="flex-shrink-0 border-b border-edge-subtle bg-surface-subtle/30 px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          <h2 className="text-lg font-semibold text-fg-primary">Launch Plan</h2>

          {/* Progress */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-2xl font-bold text-fg-primary">{progress}%</span>
              <p className="text-xs text-fg-muted">
                {completedCount} of {planTasks.length} tasks
              </p>
            </div>
            <div className="h-2 w-24 overflow-hidden rounded-full bg-surface-elevated">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Daily Targets Board - Bigger Days */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 pb-4" style={{ minWidth: "max-content" }}>
          {[1, 2, 3, 4, 5, 6, 7].map((day, dayIndex) => {
            const dayTasks = tasksByDay[day] || [];
            const dayCompleted = dayTasks.filter(t => t.status === "completed" || t.status === "succeeded").length;
            const dayProgress = dayTasks.length > 0 ? Math.round((dayCompleted / dayTasks.length) * 100) : 0;

            return (
              <div
                key={day}
                className="w-72 flex-shrink-0 rounded-xl border border-edge-subtle bg-surface-muted animate-slide-up"
                style={{ animationDelay: `${dayIndex * 40}ms` }}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between border-b border-edge-subtle px-4 py-3">
                  <span className="text-sm font-semibold text-fg-primary">Day {day}</span>
                  <div className="flex items-center gap-2">
                    {dayTasks.length > 0 && (
                      <span className="text-xs text-fg-muted">
                        {dayCompleted}/{dayTasks.length}
                      </span>
                    )}
                    {dayProgress === 100 && dayTasks.length > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
                        <svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </div>
                </div>

                {/* Tasks */}
                <div className="space-y-2 p-3">
                  {dayTasks.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-edge-subtle bg-surface-subtle/50 p-4 text-center">
                      <p className="text-xs text-fg-faint">No tasks scheduled</p>
                    </div>
                  ) : (
                    dayTasks.map((task) => {
                      const isCompleted = task.status === "completed" || task.status === "succeeded";

                      return (
                        <div
                          key={task.id}
                          onClick={() => onTaskClick(task)}
                          className={cn(
                            "group cursor-pointer rounded-lg border p-3 transition-all",
                            isCompleted
                              ? "border-emerald-500/20 bg-emerald-500/5"
                              : "border-edge-subtle bg-surface-elevated hover:border-edge-muted hover:shadow-sm"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onTaskToggle(task.id);
                              }}
                              className={cn(
                                "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors",
                                isCompleted
                                  ? "border-emerald-400 bg-emerald-400"
                                  : "border-edge-muted hover:border-accent"
                              )}
                            >
                              {isCompleted && (
                                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm font-medium leading-snug",
                                isCompleted ? "text-fg-muted line-through" : "text-fg-primary"
                              )}>
                                {task.title}
                              </p>
                              {task.description && (
                                <p className={cn(
                                  "mt-1 text-xs leading-relaxed line-clamp-3",
                                  isCompleted ? "text-fg-faint" : "text-fg-muted"
                                )}>
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
