"use client";

import { useRef, type TextareaHTMLAttributes } from "react";
import { ScrollRail } from "@/components/ScrollRail";

export function RailedTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="railed">
      <textarea ref={ref} {...props} />
      <ScrollRail target={ref} />
    </div>
  );
}
