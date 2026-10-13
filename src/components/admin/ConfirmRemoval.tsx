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
      <button type="button" className="eyebrow ink-link mt-3 text-vermilion" onClick={() => setConfirming(true)}>
        {label}
      </button>
    );
  }
  return (
    <form action={action} className="mt-3 border-l-2 border-vermilion pl-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-[0.98rem]">{question}</p>
      <div className="mt-3 flex items-center gap-4">
        <button type="submit" className="button">
          Sim, remover
        </button>
        <button type="button" className="eyebrow ink-link" onClick={() => setConfirming(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
