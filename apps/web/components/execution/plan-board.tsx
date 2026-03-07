import { cn } from "@/lib/utils";

interface Task {
  day_number: number;
  title: string;
  completed?: boolean;
}

export function PlanBoard({ tasks }: { tasks: Task[] }) {
  // Group tasks by day
  const groupedByDay = tasks.reduce(
    (acc, task) => {
      acc[task.day_number] = acc[task.day_number] || [];
      acc[task.day_number].push(task);
      return acc;
    },
    {} as Record<number, Task[]>
  );

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-edge-subtle bg-surface-subtle/50 p-8 text-center">
        <p className="text-sm text-fg-muted">No tasks generated yet.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Object.entries(groupedByDay).map(([day, dayTasks], dayIndex) => (
        <div
          key={day}
          className="w-64 shrink-0 rounded-xl border border-edge-subtle bg-surface-muted p-4 animate-slide-up"
          style={{ animationDelay: `${dayIndex * 75}ms` }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-sm font-semibold text-accent">
              Day {day}
            </span>
            <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs text-fg-faint">
              {dayTasks.length} tasks
            </span>
          </div>

          <div className="space-y-2">
            {dayTasks.map((task, taskIndex) => (
              <div
                key={task.title}
                className={cn(
                  "group rounded-lg border p-3 transition-all duration-150",
                  task.completed
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-edge-subtle bg-surface-elevated hover:border-edge-muted"
                )}
              >
                <div className="flex items-start gap-2">
                  {task.completed && (
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
                  )}
                  <p
                    className={cn(
                      "text-sm font-medium",
                      task.completed ? "text-fg-muted line-through" : "text-fg-secondary"
                    )}
                  >
                    {task.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
