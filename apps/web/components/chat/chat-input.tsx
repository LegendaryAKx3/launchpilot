"use client";

import { KeyboardEvent, useRef, useState, useImperativeHandle, forwardRef } from "react";

interface ChatInputProps {
  placeholder: string;
  onSend: (message: string) => void;
  disabled?: boolean;
}

export interface ChatInputHandle {
  setValue: (value: string) => void;
  focus: () => void;
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput(
  { placeholder, onSend, disabled },
  ref
) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    setValue: (newValue: string) => {
      setValue(newValue);
      // Trigger resize after setting value
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.style.height = "auto";
          textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
      }, 0);
    },
    focus: () => {
      textareaRef.current?.focus();
    }
  }));

  const handleSend = () => {
    const trimmed = value.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="flex-shrink-0 border-t border-edge-subtle bg-surface-subtle/30 p-4">
      <div className="relative flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full resize-none rounded-xl border border-edge-subtle bg-surface-elevated px-4 py-3 pr-12 text-sm text-fg-primary outline-none transition-all placeholder:text-fg-faint focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
            style={{ minHeight: "48px", maxHeight: "200px" }}
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-1">
            <kbd className="hidden rounded bg-surface-muted px-1.5 py-0.5 font-mono text-2xs text-fg-faint sm:inline-block">
              Enter
            </kbd>
          </div>
        </div>
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-all hover:bg-accent-hover disabled:opacity-50"
        >
          {disabled ? (
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          )}
        </button>
      </div>
      <p className="mt-2 text-center text-2xs text-fg-faint">
        Press <kbd className="rounded bg-surface-elevated px-1 font-mono">Shift + Enter</kbd> for new line
      </p>
    </div>
  );
});
