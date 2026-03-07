import "./globals.css";

import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "LaunchPilot",
  description: "Supervised multi-agent launch flow"
};

// Script to prevent flash of incorrect theme - runs before React hydration
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (theme === 'dark' || (!theme && prefersDark)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
