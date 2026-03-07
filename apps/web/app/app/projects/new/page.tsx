"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { env } from "@/lib/env";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [goal, setGoal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-2 animate-fade-in">
      <section className="rounded-xl border border-edge-subtle bg-surface-muted p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-fg-primary">Create Project</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Start by naming the project and writing a clear launch goal.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);

            setSubmitting(true);
            try {
              const response = await fetch(`${env.apiBaseUrl}/projects`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name,
                  summary,
                  goal
                })
              });

              if (!response.ok) {
                setError("Project creation failed.");
                return;
              }

              const payload = await response.json();
              const slug = payload?.data?.slug as string | undefined;
              const fallbackSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
              router.push(`/app/projects/${slug ?? fallbackSlug}`);
            } catch {
              setError("Project creation failed.");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fg-secondary">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-edge-subtle bg-surface-elevated px-3 py-2.5 text-sm text-fg-primary placeholder:text-fg-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="My awesome project"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fg-secondary">Summary</span>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="h-24 w-full rounded-lg border border-edge-subtle bg-surface-elevated px-3 py-2.5 text-sm text-fg-primary placeholder:text-fg-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="Brief description of what you're building..."
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-fg-secondary">Goal</span>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full rounded-lg border border-edge-subtle bg-surface-elevated px-3 py-2.5 text-sm text-fg-primary placeholder:text-fg-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="Get 10 users in 2 weeks"
            />
          </label>

          <div className="pt-2">
            <button
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {submitting ? (
                <>
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
                  Creating...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Create and Start
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}
        </form>
      </section>

      <aside className="rounded-xl border border-edge-subtle bg-surface-muted p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-fg-primary">
          <svg className="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          What happens next
        </h2>
        <ol className="mt-4 space-y-4">
          {[
            { step: "1", text: "Research is run against your project context." },
            { step: "2", text: "You choose positioning direction." },
            { step: "3", text: "Execution plan and assets are generated." },
            { step: "4", text: "Sensitive actions are gated behind approvals." }
          ].map((item, index) => (
            <li
              key={item.step}
              className="flex items-start gap-3 animate-slide-up"
              style={{ animationDelay: `${index * 75}ms` }}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-elevated font-mono text-xs font-semibold text-accent">
                {item.step}
              </span>
              <span className="text-sm text-fg-secondary">{item.text}</span>
            </li>
          ))}
        </ol>

        <div className="mt-6 rounded-lg border border-edge-subtle bg-surface-elevated p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fg-faint">Pro tip</p>
          <p className="mt-2 text-sm text-fg-muted">
            The more context you provide in the summary, the better the research agents will perform.
          </p>
        </div>
      </aside>
    </div>
  );
}
