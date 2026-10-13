"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import type { FormState } from "@/app/admin/actions";

export const INITIAL_FORM_STATE: FormState = { ok: false, message: null };

export function SubmitButton({ children, pendingLabel = "Salvando…", className = "button" }: { children: ReactNode; pendingLabel?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FormFeedback({ state }: { state: FormState }) {
  if (!state.message) return <p aria-live="polite" className="min-h-6" />;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={`min-h-6 border-l-2 pl-3 text-[0.95rem] ${state.ok ? "border-ink text-ink" : "border-vermilion text-vermilion"}`}
    >
      {state.message}
    </p>
  );
}

export function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="eyebrow text-ink-soft">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-[0.82rem] text-ink-soft">{hint}</p> : null}
      {error ? (
        <p id={`${name}-error`} className="mt-1 text-[0.85rem] text-vermilion">
          {error}
        </p>
      ) : null}
    </div>
  );
}
