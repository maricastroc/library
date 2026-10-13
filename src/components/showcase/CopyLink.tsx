"use client";

import { useState } from "react";

export function CopyLink({ className = "" }: { className?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setStatus("copied");
        } catch {
          setStatus("failed");
        }
        window.setTimeout(() => setStatus("idle"), 2400);
      }}
    >
      <span aria-live="polite">
        {status === "copied" ? "Link copied" : status === "failed" ? "Copy the page address" : "Copy showcase link"}
      </span>
    </button>
  );
}
