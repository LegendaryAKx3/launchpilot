import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";

interface OutreachRow {
  name?: string;
  email?: string;
  segment?: string;
  status?: string;
}

export function OutreachTable({ rows }: { rows: OutreachRow[] }) {
  return (
    <DataTable
      headers={["Name", "Email", "Segment", "Status"]}
      rows={rows.map((row) => [
        <span key="name" className="font-medium text-fg-primary">
          {row.name ?? "-"}
        </span>,
        <span key="email" className="font-mono text-sm text-fg-secondary">
          {row.email ?? "-"}
        </span>,
        <span key="segment" className="text-fg-muted">
          {row.segment ?? "-"}
        </span>,
        <StatusBadge key="status" status={row.status ?? "draft"} />
      ])}
      emptyMessage="No outreach contacts yet."
    />
  );
}
