import Link from "next/link";

import { StatCard } from "@/components/ui/stat-card";
import { serverApiFetch } from "@/lib/api";

interface GitHubStatusPayload {
  linked: boolean;
  provider: string;
  provider_user_id: string | null;
  has_access_token: boolean;
}

interface GitHubLinkPayload {
  url: string;
}

export default async function SecurityCenterPage() {
  const githubStatus = await serverApiFetch<GitHubStatusPayload>("/connectors/github/status");
  const githubLink = await serverApiFetch<GitHubLinkPayload>("/connectors/github/link-url");
  const linkedAccounts = [
    {
      provider: "GitHub",
      status: githubStatus?.linked ? "linked" : "not linked",
      detail: githubStatus?.has_access_token ? "token available" : "token unavailable",
    },
    { provider: "Google", status: "linked", icon: "google" },
    { provider: "Passkey", status: "enrolled", icon: "key" }
  ];

  const recentActions = [
    { action: "Approved send batch #42", time: "2 hours ago" },
    { action: "Requested connector link", time: "1 day ago" }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-bold text-fg-primary">Security Center</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Auth0 session state, linked accounts, and sensitive action history.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 stagger">
        <StatCard
          label="Current Role"
          value="owner"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          }
        />
        <StatCard
          label="MFA Status"
          value="enabled"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          }
        />
        <StatCard
          label="Last Step-up"
          value="Today"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-edge-subtle bg-surface-muted p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-fg-primary">
            <svg className="h-4 w-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
            Linked Accounts
          </h2>
          <ul className="mt-4 space-y-3">
            {linkedAccounts.map((account, index) => (
              <li
                key={account.provider}
                className="flex items-center justify-between rounded-lg border border-edge-subtle bg-surface-elevated px-3 py-2 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div>
                  <span className="text-sm text-fg-secondary">{account.provider}</span>
                  {"detail" in account && account.detail ? (
                    <p className="text-xs text-fg-faint">{account.detail}</p>
                  ) : null}
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                    {account.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg border border-edge-subtle bg-surface-elevated p-3">
            <p className="text-xs text-fg-faint">GitHub Connector</p>
            <p className="mt-1 text-sm text-fg-secondary">
              {githubStatus?.linked
                ? "GitHub is linked. You can fetch repository context in project workflows."
                : "GitHub is not linked for this account yet."}
            </p>
            <div className="mt-3">
              <Link
                href={githubLink?.url ?? "/auth/login?connection=github"}
                className="inline-flex items-center rounded-md bg-accent px-3 py-2 text-xs font-medium text-white"
              >
                {githubStatus?.linked ? "Reconnect GitHub" : "Connect GitHub"}
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-edge-subtle bg-surface-muted p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-fg-primary">
            <svg className="h-4 w-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Recent Sensitive Actions
          </h2>
          <ul className="mt-4 space-y-3">
            {recentActions.map((item, index) => (
              <li
                key={item.action}
                className="rounded-lg border border-edge-subtle bg-surface-elevated px-3 py-2 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <p className="text-sm text-fg-secondary">{item.action}</p>
                <p className="mt-0.5 text-xs text-fg-faint">{item.time}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
