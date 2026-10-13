"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";
import { SubmitButton, INITIAL_FORM_STATE, FormFeedback } from "./FormParts";

export function LoginForm({ destination, configured }: { destination: string; configured: boolean }) {
  const [state, action] = useActionState(login, INITIAL_FORM_STATE);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="from" value={destination} />
      <div>
        <label htmlFor="password" className="eyebrow text-ink-soft">
          Counter password
        </label>
        <input id="password" name="password" type="password" className="field" autoComplete="current-password" required autoFocus disabled={!configured} />
      </div>
      <FormFeedback state={state} />
      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
