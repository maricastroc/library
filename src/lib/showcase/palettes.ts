export const SHOWCASE_PALETTES = {
  ink: { label: "Tinta", background: "#1c1a17", ink: "#f3ecdd", accent: "#dba53a" },
  paper: { label: "Papel", background: "#f6f1e6", ink: "#1c1a17", accent: "#b5301a" },
  slate: { label: "Ardósia", background: "#2b4258", ink: "#f3ecdd", accent: "#e9c98a" },
  wine: { label: "Vinho", background: "#6a1b28", ink: "#f6e9dc", accent: "#e8b7a0" },
  sage: { label: "Sálvia", background: "#a8b39a", ink: "#1c1a17", accent: "#7b1f2e" },
  ochre: { label: "Ocre", background: "#dba53a", ink: "#1c1a17", accent: "#34506b" },
} as const;

export type ShowcasePalette = keyof typeof SHOWCASE_PALETTES;
