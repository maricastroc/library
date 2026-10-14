import type { Metadata } from "next";
import "./prototypes.css";

export const metadata: Metadata = { title: "Prototypes", robots: { index: false } };

export default function PrototypesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
