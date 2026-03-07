import Link from "next/link";

import { ActionQueue } from "@/components/execution/action-queue";
import { AssetCard } from "@/components/execution/asset-card";
import { OutreachTable } from "@/components/execution/outreach-table";
import { PlanBoard } from "@/components/execution/plan-board";

export default async function ExecutionPage({
  params
}: {
  params: Promise<{ projectSlug: string }>;
}) {
  const { projectSlug } = await params;

  const tasks = Array.from({ length: 7 }, (_, idx) => ({
    day_number: idx + 1,
    title: `Launch task ${idx + 1}`,
    completed: idx < 2
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="rounded-xl border border-edge-subtle bg-surface-muted p-5">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-fg-primary">Execution</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Run this section in order. Primary actions are highlighted below.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <button className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Assets
          </button>
          <button className="flex items-center justify-center gap-2 rounded-lg border border-edge-subtle bg-surface-elevated px-4 py-2.5 text-sm font-medium text-fg-secondary transition-colors hover:border-edge-muted hover:text-fg-primary">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Prepare Outreach Batch
          </button>
          <Link
            href={`/app/projects/${projectSlug}/approvals`}
            className="flex items-center justify-center gap-2 rounded-lg border border-edge-subtle bg-surface-elevated px-4 py-2.5 text-sm font-medium text-fg-secondary transition-colors hover:border-edge-muted hover:text-fg-primary"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Review Approvals
          </Link>
        </div>
      </header>

      <section>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-fg-primary">
          <svg className="h-4 w-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          7-Day Plan
        </h3>
        <PlanBoard tasks={tasks} />
      </section>

      <section>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-fg-primary">
          <svg className="h-4 w-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          Generated Assets
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 stagger">
          <AssetCard asset={{ title: "Landing copy v1", asset_type: "landing_copy", status: "draft" }} />
          <AssetCard asset={{ title: "Email sequence v1", asset_type: "email_copy", status: "draft" }} />
          <AssetCard asset={{ title: "Image ad angle A", asset_type: "image_ad", status: "draft" }} />
        </div>
      </section>

      <section>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-fg-primary">
          <svg className="h-4 w-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          Outreach Drafts
        </h3>
        <OutreachTable
          rows={[
            { name: "Ari", email: "ari@example.com", segment: "student", status: "draft" },
            { name: "Mina", email: "mina@example.com", segment: "indie", status: "draft" }
          ]}
        />
      </section>

      <section>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-fg-primary">
          <svg className="h-4 w-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          Action Queue
        </h3>
        <ActionQueue
          items={[
            { title: "Send email batch #1", status: "pending", reason: "Requires execution:send scope" },
            { title: "Promote image ad", status: "pending", reason: "Requires review before publish" }
          ]}
        />
      </section>
    </div>
  );
}
