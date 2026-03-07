"use client";

import { ReactNode, useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
}

const widthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl"
};

export function DetailDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "md"
}: DetailDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-200",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={cn(
          "fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col border-l border-edge-subtle bg-surface-elevated shadow-2xl transition-transform duration-200 ease-out",
          widthClasses[width],
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-edge-subtle px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-fg-primary">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-fg-muted transition-colors hover:bg-surface-overlay hover:text-fg-primary"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-edge-subtle bg-surface-subtle/50 px-6 py-4">{footer}</div>
        )}
      </div>
    </>
  );
}

interface DrawerFieldProps {
  label: string;
  children: ReactNode;
  error?: string;
}

export function DrawerField({ label, children, error }: DrawerFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-fg-secondary">{label}</label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface DrawerInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function DrawerInput({ error, className, ...props }: DrawerInputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border bg-surface-muted px-3 py-2 text-sm text-fg-primary outline-none transition-colors placeholder:text-fg-faint focus:border-accent",
        error ? "border-red-500" : "border-edge-subtle",
        className
      )}
      {...props}
    />
  );
}

interface DrawerTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function DrawerTextarea({ error, className, ...props }: DrawerTextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border bg-surface-muted px-3 py-2 text-sm text-fg-primary outline-none transition-colors placeholder:text-fg-faint focus:border-accent",
        error ? "border-red-500" : "border-edge-subtle",
        className
      )}
      {...props}
    />
  );
}

interface DrawerSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export function DrawerSelect({ error, className, children, ...props }: DrawerSelectProps) {
  return (
    <select
      className={cn(
        "w-full rounded-lg border bg-surface-muted px-3 py-2 text-sm text-fg-primary outline-none transition-colors focus:border-accent",
        error ? "border-red-500" : "border-edge-subtle",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

interface DrawerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive";
  loading?: boolean;
}

export function DrawerButton({
  variant = "primary",
  loading,
  disabled,
  children,
  className,
  ...props
}: DrawerButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-accent text-white hover:bg-accent-hover",
        variant === "secondary" && "border border-edge-subtle text-fg-secondary hover:bg-surface-overlay",
        variant === "destructive" && "bg-red-500 text-white hover:bg-red-600",
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
