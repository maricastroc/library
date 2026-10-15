"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";
import { SubmitButton, INITIAL_FORM_STATE, FormFeedback } from "./FormParts";

export function LoginForm({ destination, configured }: { destination: string; configured: boolean }) {
  const [state, action] = useActionState(login, INITIAL_FORM_STATE);
  return (
    <form action={action} className="door-form">
      <input type="hidden" name="from" value={destination} />
      <div>
        <label htmlFor="password" className="eyebrow counter-field-label">
          Counter password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="field door-field"
          autoComplete="current-password"
          required
          autoFocus
          disabled={!configured}
          aria-invalid={state.ok === false && state.message ? true : undefined}
        />
      </div>
      <div className="door-submit">
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
        <FormFeedback state={state} />
      </div>
    </form>
  );
}
