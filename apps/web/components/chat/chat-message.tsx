"use client";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

interface ChatMessageProps {
  message: Message;
  isLast: boolean;
}

export function ChatMessage({ message, isLast }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <div className="rounded-full bg-surface-elevated px-4 py-1.5 text-xs text-fg-muted">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-3 py-2 ${isUser ? "flex-row-reverse" : ""} ${isLast ? "animate-slide-up" : ""}`}
    >
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
          isUser
            ? "bg-surface-elevated text-fg-muted"
            : "bg-gradient-to-br from-accent to-blue-400 text-white"
        }`}
      >
        {isUser ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3" />
          </svg>
        )}
      </div>

      {/* Message Content */}
      <div
        className={`group relative max-w-[80%] ${isUser ? "items-end" : "items-start"}`}
      >
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "rounded-tr-md bg-accent text-white"
              : "rounded-tl-md bg-surface-elevated text-fg-primary"
          }`}
        >
          <MessageContent content={message.content} />
        </div>
        <div
          className={`mt-1 flex items-center gap-2 text-2xs text-fg-faint opacity-0 transition-opacity group-hover:opacity-100 ${
            isUser ? "justify-end" : "justify-start"
          }`}
        >
          <span>
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  // Parse markdown-like formatting
  const parts = content.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\n)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={index} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return (
            <em key={index} className="italic">
              {part.slice(1, -1)}
            </em>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={index} className="rounded bg-black/10 px-1.5 py-0.5 font-mono text-xs">
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part === "\n") {
          return <br key={index} />;
        }
        return part;
      })}
    </>
  );
}
