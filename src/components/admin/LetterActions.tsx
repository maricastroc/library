"use client";

import { useFormStatus } from "react-dom";
import { updateInterest } from "@/app/admin/actions";

function Buttons({ resolve, ready }: { resolve: string; ready: boolean }) {
  const { pending, data } = useFormStatus();
  const filing = pending ? data?.get("status") : null;
  return (
    <div className="letter-buttons">
      <button type="submit" name="status" value="fulfilled" className={ready ? "button" : "button button-outline"} disabled={pending}>
        {filing === "fulfilled" ? "Filing…" : resolve}
      </button>
      <button type="submit" name="status" value="cancelled" className="button-quiet" disabled={pending}>
        {filing === "cancelled" ? "Filing…" : "Cancel the request"}
      </button>
    </div>
  );
}

export function LetterActions({ id, kind, stock }: { id: number; kind: "reservation" | "notice"; stock: number | null }) {
  return (
    <form action={updateInterest} className="letter-actions">
      <input type="hidden" name="id" value={id} />
      {kind === "reservation" && stock !== null && stock > 0 ? (
        <label className="letter-decrement">
          <input type="checkbox" name="decrement" value="1" defaultChecked />
          <span>
            take one off the stock <span className="letter-decrement-count">{stock} → {stock - 1}</span>
          </span>
        </label>
      ) : null}
      <Buttons resolve={kind === "reservation" ? "Mark as fulfilled" : "Mark as told"} ready={stock === null || stock > 0} />
    </form>
  );
}

export function ReopenButton({ id }: { id: number }) {
  return (
    <form action={updateInterest}>
      <input type="hidden" name="id" value={id} />
      <Reopen />
    </form>
  );
}

function Reopen() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name="status" value="new" className="button-quiet" disabled={pending}>
      {pending ? "Reopening…" : "Reopen"}
    </button>
  );
}
