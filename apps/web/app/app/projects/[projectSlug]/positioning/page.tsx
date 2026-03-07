import Link from "next/link";

import { IcpCard } from "@/components/positioning/icp-card";
import { PositioningPreview } from "@/components/positioning/positioning-preview";
import { PricingDirectionCard } from "@/components/positioning/pricing-direction-card";

export default async function PositioningPage({
  params
}: {
  params: Promise<{ projectSlug: string }>;
}) {
  const { projectSlug } = await params;

  const icps = [
    { label: "CS students shipping portfolio tools", selected: true },
    { label: "Indie developers with early SaaS MVPs", selected: false },
    { label: "Solo technical founders testing niche tools", selected: false }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-fg-primary">Positioning</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Pick ICP, wedge, and core message before execution.
          </p>
        </div>
        <Link
          href={`/app/projects/${projectSlug}/execution`}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Save and Continue
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-fg-primary">
            <svg className="h-4 w-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Select ICP
          </h3>
          <div className="space-y-3">
            {icps.map((icp, index) => (
              <div key={icp.label} className="animate-slide-up" style={{ animationDelay: `${index * 75}ms` }}>
                <IcpCard icp={icp.label} selected={icp.selected} />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <PositioningPreview
            headline="Turn your side project into first users"
            subheadline="Research, position, and execute with supervised outbound."
            statement="For technical builders with weak GTM skills, Growth Launchpad creates a concrete first-user launch system."
            benefits={["Narrow ICP and wedge", "Actionable 7-day plan", "Approval-gated execution"]}
          />
          <PricingDirectionCard value="Free + optional paid launch sprint" />
        </section>
      </div>
    </div>
  );
}
