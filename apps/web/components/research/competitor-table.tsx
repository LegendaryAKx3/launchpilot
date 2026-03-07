import { DataTable } from "@/components/ui/data-table";

interface Competitor {
  name: string;
  positioning?: string;
  pricing?: string;
}

export function CompetitorTable({ rows }: { rows: Competitor[] }) {
  return (
    <DataTable
      headers={["Name", "Positioning", "Pricing"]}
      rows={rows.map((row) => [
        <span key="name" className="font-medium text-fg-primary">
          {row.name}
        </span>,
        <span key="positioning" className="text-fg-secondary">
          {row.positioning ?? "-"}
        </span>,
        <span key="pricing" className="font-mono text-accent">
          {row.pricing ?? "-"}
        </span>
      ])}
      emptyMessage="No competitors identified yet."
    />
  );
}
