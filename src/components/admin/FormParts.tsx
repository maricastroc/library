"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import type { FormState } from "@/app/admin/actions";

export const INITIAL_FORM_STATE: FormState = { ok: false, message: null };

export function SubmitButton({ children, pendingLabel = "Saving…", className = "button" }: { children: ReactNode; pendingLabel?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormFeedback({ state }: { state: FormState }) {
  if (!state.message) return <p aria-live="polite" className="slip" />;
  return (
    <p key={state.message} role={state.ok ? "status" : "alert"} className="slip slip-enter" data-tone={state.ok ? undefined : "error"}>
      {state.message}
    </p>
  );
}

export function Field({
  label,
  name,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="eyebrow counter-field-label">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="counter-field-hint">{hint}</p> : null}
      {error ? (
        <p id={`${name}-error`} className="counter-field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
