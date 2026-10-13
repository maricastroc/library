export const SHOWCASE_PALETTES = {
  ink: { label: "Ink", background: "#1c1a17", ink: "#f3ecdd", accent: "#dba53a" },
  paper: { label: "Paper", background: "#f6f1e6", ink: "#1c1a17", accent: "#b5301a" },
  slate: { label: "Slate", background: "#2b4258", ink: "#f3ecdd", accent: "#e9c98a" },
  wine: { label: "Wine", background: "#6a1b28", ink: "#f6e9dc", accent: "#e8b7a0" },
  sage: { label: "Sage", background: "#a8b39a", ink: "#1c1a17", accent: "#7b1f2e" },
  ochre: { label: "Ochre", background: "#dba53a", ink: "#1c1a17", accent: "#34506b" },
} as const;

export type ShowcasePalette = keyof typeof SHOWCASE_PALETTES;
