import Link from "next/link";

import { CompetitorTable } from "@/components/research/competitor-table";
import { PainPointMap } from "@/components/research/pain-point-map";
import { WedgeCard } from "@/components/research/wedge-card";

export default async function ResearchPage({
  params
}: {
  params: Promise<{ projectSlug: string }>;
}) {
  const { projectSlug } = await params;

  const wedges = [
    { label: "Hackathon to first users", description: "Focus student founders", score: 0.84 },
    { label: "Approval-gated outbound", description: "Execution with trust", score: 0.77 }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-fg-primary">Research</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Understand competitors, pain points, and the best wedge.
          </p>
        </div>
        <Link
          href={`/app/projects/${projectSlug}/positioning`}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Continue to Positioning
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </header>

      <section className="rounded-xl border border-edge-subtle bg-surface-muted p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-fg-primary">
          <svg className="h-4 w-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          Competitor Board
        </h3>
        <CompetitorTable
          rows={[
            { name: "Notion", positioning: "All in one workspace", pricing: "Freemium" },
            { name: "Linear", positioning: "Fast issue tracking", pricing: "Per-seat" }
          ]}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-fg-primary">
            <svg className="h-4 w-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Pain Point Map
          </h3>
          <PainPointMap
            items={[
              { label: "No clear first audience", description: "Messaging too broad", severity: "high" },
              { label: "Execution uncertainty", description: "No structured launch workflow", severity: "medium" }
            ]}
          />
        </section>

        <section>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-fg-primary">
            <svg className="h-4 w-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Top Wedges
          </h3>
          <div className="space-y-3">
            {wedges.map((wedge, index) => (
              <div key={wedge.label} className="animate-slide-up" style={{ animationDelay: `${index * 75}ms` }}>
                <WedgeCard wedge={wedge} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
