import { ReactNode } from "react";

interface DataTableProps {
  headers: string[];
  rows: ReactNode[][];
  emptyMessage?: string;
}

export function DataTable({ headers, rows, emptyMessage = "No data available" }: DataTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-edge-subtle bg-surface-muted">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-edge-subtle bg-surface-elevated/50">
              {headers.map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-edge-subtle">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-4 py-8 text-center text-sm text-fg-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="transition-colors hover:bg-surface-elevated/30"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-4 py-3 text-sm text-fg-secondary"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
