"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";
import { Plan, Task } from "./plans-list";

interface PlanDetailProps {
  plan: Plan;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskToggle: (taskId: string) => void;
}

export function PlanDetail({ plan, tasks, onTaskClick, onTaskToggle }: PlanDetailProps) {
  const planTasks = useMemo(() => {
    return tasks.filter((task) => task.launch_plan_id === plan.id);
  }, [tasks, plan.id]);

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

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-edge-subtle px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-fg-primary">
              {plan.primary_channel || "Launch Plan"}
            </h2>
            {plan.secondary_channels && plan.secondary_channels.length > 0 && (
              <p className="mt-1 text-sm text-fg-muted">
                Secondary: {plan.secondary_channels.join(", ")}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-fg-primary">
              {completedCount}/{planTasks.length} tasks
            </p>
            <p className="text-xs text-fg-muted">
              {Math.round((completedCount / planTasks.length) * 100) || 0}% complete
            </p>
          </div>
        </div>

        {/* KPIs */}
        {plan.kpis && plan.kpis.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {plan.kpis.map((kpi, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                {kpi}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 7-Day Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 pb-4" style={{ minWidth: "max-content" }}>
          {[1, 2, 3, 4, 5, 6, 7].map((day, dayIndex) => {
            const dayTasks = tasksByDay[day] || [];
            const isToday = day === 1; // Could be dynamic based on launch date

            return (
              <div
                key={day}
                className={cn(
                  "w-64 flex-shrink-0 rounded-xl border bg-surface-muted animate-slide-up",
                  isToday ? "border-accent/30" : "border-edge-subtle"
                )}
                style={{ animationDelay: `${dayIndex * 50}ms` }}
              >
                {/* Day Header */}
                <div className={cn(
                  "flex items-center justify-between rounded-t-xl px-4 py-3",
                  isToday ? "bg-accent/5" : ""
                )}>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-mono text-sm font-semibold",
                      isToday ? "text-accent" : "text-fg-primary"
                    )}>
                      Day {day}
                    </span>
                    {isToday && (
                      <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                        Today
                      </span>
                    )}
                  </div>
                  <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs text-fg-faint">
                    {dayTasks.length}
                  </span>
                </div>

                {/* Tasks */}
                <div className="space-y-2 p-3">
                  {dayTasks.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-edge-subtle bg-surface-subtle/50 p-4 text-center">
                      <p className="text-xs text-fg-faint">No tasks</p>
                    </div>
                  ) : (
                    dayTasks.map((task, taskIndex) => {
                      const isCompleted = task.status === "completed" || task.status === "succeeded";

                      return (
                        <div
                          key={task.id}
                          className={cn(
                            "group cursor-pointer rounded-lg border p-3 transition-all",
                            isCompleted
                              ? "border-emerald-500/30 bg-emerald-500/5"
                              : "border-edge-subtle bg-surface-elevated hover:border-edge-muted hover:shadow-sm"
                          )}
                          onClick={() => onTaskClick(task)}
                          style={{ animationDelay: `${(dayIndex * 50) + (taskIndex * 25)}ms` }}
                        >
                          <div className="flex items-start gap-2">
                            {/* Checkbox */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onTaskToggle(task.id);
                              }}
                              className={cn(
                                "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors",
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

                            {/* Task content */}
                            <div className="flex-1 min-w-0">
                              <p
                                className={cn(
                                  "text-sm font-medium",
                                  isCompleted ? "text-fg-muted line-through" : "text-fg-secondary"
                                )}
                              >
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="mt-1 text-xs text-fg-faint line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                            </div>

                            {/* Edit indicator */}
                            <div className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                              <svg className="h-4 w-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </div>
                          </div>

                          {/* Priority indicator */}
                          {task.priority && task.priority <= 2 && (
                            <div className="mt-2 flex items-center gap-1">
                              <span className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-medium",
                                task.priority === 1
                                  ? "bg-red-500/10 text-red-400"
                                  : "bg-amber-500/10 text-amber-400"
                              )}>
                                {task.priority === 1 ? "High" : "Medium"}
                              </span>
                            </div>
                          )}
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
