interface SourceDoc {
  title: string;
  type: string;
  url?: string;
}

export function SourceDocsCard({ docs }: { docs: SourceDoc[] }) {
  return (
    <div className="rounded-xl border border-edge-subtle bg-surface-muted p-5">
      <div className="flex items-center gap-2">
        <svg className="h-4 w-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="text-sm font-semibold text-fg-primary">Source Documents</h3>
      </div>

      {docs.length === 0 ? (
        <p className="mt-4 text-sm text-fg-muted">No documents uploaded yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {docs.map((doc, index) => (
            <li
              key={`${doc.title}-${doc.type}`}
              className="group rounded-lg border border-edge-subtle bg-surface-elevated p-3 transition-colors hover:border-edge-muted animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-fg-secondary group-hover:text-fg-primary">
                    {doc.title}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-fg-faint">{doc.type}</p>
                </div>
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg p-1.5 text-fg-muted transition-colors hover:bg-accent/10 hover:text-accent"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
