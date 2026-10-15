"use client";

import { useState } from "react";

export function ConfirmRemoval({
  action,
  id,
  label,
  question,
}: {
  action: (form: FormData) => Promise<void>;
  id: number;
  label: string;
  question: string;
}) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button type="button" className="button-quiet" data-tone="danger" onClick={() => setConfirming(true)}>
        {label}
      </button>
    );
  }
  return (
    <form action={action} className="confirm slip-enter">
      <input type="hidden" name="id" value={id} />
      <p className="text-[0.98rem] leading-snug">{question}</p>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="button">
          Yes, remove
        </button>
        <button type="button" className="button-quiet" onClick={() => setConfirming(false)} autoFocus>
          Keep it
        </button>
      </div>
    </form>
  );
}
