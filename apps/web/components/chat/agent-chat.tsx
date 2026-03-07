"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ChatMessage, Message } from "./chat-message";
import { ChatInput, ChatInputHandle } from "./chat-input";

interface AgentChatProps {
  agentName: string;
  agentDescription: string;
  placeholder: string;
  onSend: (message: string, mode: string) => Promise<string | null>;
  isProcessing: boolean;
  messages: Message[];
  onMessagesChange: (messages: Message[]) => void;
  modes?: { value: string; label: string }[];
  quickActions?: { label: string; message: string }[];
}

export function AgentChat({
  agentName,
  agentDescription,
  placeholder,
  onSend,
  isProcessing,
  messages,
  onMessagesChange,
  modes = [
    { value: "baseline", label: "Standard" },
    { value: "deepen", label: "Go deeper" },
    { value: "retry", label: "Try again" },
    { value: "extend", label: "Expand" }
  ],
  quickActions = []
}: AgentChatProps) {
  const [mode, setMode] = useState(modes[0]?.value ?? "baseline");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<ChatInputHandle>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const handleSend = useCallback(
    async (content: string) => {
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date()
      };
      const updatedWithUser = [...messages, userMessage];
      onMessagesChange(updatedWithUser);

      const response = await onSend(content, mode);

      if (response) {
        const agentMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response,
          timestamp: new Date()
        };
        onMessagesChange([...updatedWithUser, agentMessage]);
      }
    },
    [mode, onSend, messages, onMessagesChange]
  );

  const handleQuickAction = useCallback((message: string) => {
    inputRef.current?.setValue(message);
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Agent Header */}
      <div className="flex-shrink-0 border-b border-edge-subtle bg-surface-subtle/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-blue-400 text-white shadow-lg shadow-accent/20">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 15.5m14.8-.2l-.8 2.5a2.25 2.25 0 01-2.085 1.55H7.085A2.25 2.25 0 015 17.8l-.8-2.5" />
              </svg>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-subtle bg-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-fg-primary">{agentName}</h3>
            <p className="text-xs text-fg-muted">{agentDescription}</p>
          </div>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="rounded-lg border border-edge-subtle bg-surface-elevated px-3 py-1.5 text-xs font-medium text-fg-secondary outline-none transition-colors hover:border-edge-muted focus:border-accent"
          >
            {modes.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-1 p-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/10 to-purple-500/10">
                <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h4 className="text-sm font-medium text-fg-primary">Start the conversation</h4>
              <p className="mt-1 max-w-xs text-xs text-fg-muted">
                Send a message to guide {agentName.toLowerCase()}. Be specific about what you want to explore.
              </p>
              {quickActions.length > 0 && (
                <div className="mt-6 flex w-full flex-col gap-2 px-2">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleQuickAction(action.message)}
                      className="w-full rounded-lg border border-edge-subtle bg-surface-elevated px-4 py-2.5 text-left text-sm text-fg-secondary transition-all hover:border-accent hover:bg-accent/5 hover:text-fg-primary"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              isLast={index === messages.length - 1}
            />
          ))}

          {isProcessing && (
            <div className="flex gap-3 py-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-blue-400 text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3" />
                </svg>
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-surface-elevated px-4 py-3">
                <div className="h-2 w-2 animate-pulse rounded-full bg-accent" style={{ animationDelay: "0ms" }} />
                <div className="h-2 w-2 animate-pulse rounded-full bg-accent" style={{ animationDelay: "150ms" }} />
                <div className="h-2 w-2 animate-pulse rounded-full bg-accent" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <ChatInput
        ref={inputRef}
        placeholder={placeholder}
        onSend={handleSend}
        disabled={isProcessing}
      />
    </div>
  );
}
