export type AtmosphereId =
  | "melancholic"
  | "comforting"
  | "dark"
  | "luminous"
  | "unsettling"
  | "ironic"
  | "contemplative"
  | "intense"
  | "dreamlike"
  | "nostalgic"
  | "tense"
  | "raw";

export type Atmosphere = {
  id: AtmosphereId;
  label: string;
  noun: string;
  description: string;
  color: string;
};

export const ATMOSPHERES: Atmosphere[] = [
  {
    id: "melancholic",
    label: "melancólica",
    noun: "melancolia",
    description: "tristeza suave, saudade, perda, despedida, solidão, vazio, chuva, fim de tarde",
    color: "#34506b",
  },
  {
    id: "comforting",
    label: "acolhedora",
    noun: "acolhimento",
    description: "ternura, afeto, aconchego, consolo, reconforto, delicadeza, amizade, cuidado, calor humano",
    color: "#c56a45",
  },
  {
    id: "dark",
    label: "sombria",
    noun: "sombra",
    description: "escuridão, desespero, morte, violência, pessimismo, opressão, peso, tragédia",
    color: "#211f1d",
  },
  {
    id: "luminous",
    label: "luminosa",
    noun: "luz",
    description: "esperança, alegria, leveza, otimismo, encantamento, recomeço, vitalidade",
    color: "#dba53a",
  },
  {
    id: "unsettling",
    label: "inquietante",
    noun: "inquietação",
    description: "estranheza, desconforto, perturbação, absurdo, ameaça difusa, mal-estar, paranoia",
    color: "#24483e",
  },
  {
    id: "ironic",
    label: "irônica",
    noun: "ironia",
    description: "humor, sátira, sarcasmo, comicidade, riso, deboche, crítica mordaz",
    color: "#d2452f",
  },
  {
    id: "contemplative",
    label: "contemplativa",
    noun: "contemplação",
    description: "silêncio, reflexão, serenidade, lentidão, observação, filosofia, introspecção calma",
    color: "#87957a",
  },
  {
    id: "intense",
    label: "intensa",
    noun: "intensidade",
    description: "paixão, fúria, desejo, visceral, arrebatamento, conflito emocional extremo, obsessão",
    color: "#7b1f2e",
  },
  {
    id: "dreamlike",
    label: "onírica",
    noun: "sonho",
    description: "sonho, fantasia, realismo mágico, maravilhoso, fábula, mito, imaginação, surreal",
    color: "#5d4b8b",
  },
  {
    id: "nostalgic",
    label: "nostálgica",
    noun: "nostalgia",
    description: "memória, infância, passado, lembrança, tempo perdido, saudade de uma época",
    color: "#c18f8a",
  },
  {
    id: "tense",
    label: "tensa",
    noun: "tensão",
    description: "suspense, perigo, mistério, perseguição, investigação, urgência, medo",
    color: "#4b4f55",
  },
  {
    id: "raw",
    label: "crua",
    noun: "crueza",
    description: "secura, realismo duro, miséria, fome, injustiça social, denúncia, brutalidade sem enfeite",
    color: "#cdbd9b",
  },
];

export const ATMOSPHERE_IDS = ATMOSPHERES.map((atmosphere) => atmosphere.id);
export const ATMOSPHERE_BY_ID = Object.fromEntries(
  ATMOSPHERES.map((atmosphere) => [atmosphere.id, atmosphere]),
) as Record<AtmosphereId, Atmosphere>;

export const PACE_LEVELS = [
  { value: 1, label: "lento", description: "ritmo lento, demorado, de frases longas e pouca ação" },
  { value: 2, label: "pausado", description: "ritmo pausado, que avança sem pressa" },
  { value: 3, label: "fluido", description: "ritmo fluido e equilibrado" },
  { value: 4, label: "ágil", description: "ritmo ágil, capítulos curtos, muita ação" },
  { value: 5, label: "vertiginoso", description: "ritmo vertiginoso, frenético, impossível de largar" },
] as const;

export const DENSITY_LEVELS = [
  { value: 1, label: "leve", description: "leitura leve e acessível" },
  { value: 2, label: "equilibrada", description: "leitura de densidade equilibrada" },
  { value: 3, label: "densa", description: "leitura densa, que pede atenção" },
  { value: 4, label: "exigente", description: "leitura exigente, complexa, experimental ou erudita" },
] as const;

export const STYLES = [
  { id: "lyrical", label: "lírico", description: "linguagem poética, musical, cheia de imagens" },
  { id: "spare", label: "seco", description: "frases curtas, diretas, sem enfeite" },
  { id: "wry", label: "irônico", description: "narrador irônico, espirituoso, que brinca com o leitor" },
  { id: "experimental", label: "experimental", description: "forma inventiva, fragmentada ou fora do convencional" },
  { id: "colloquial", label: "coloquial", description: "voz oral, popular, próxima da fala" },
  { id: "classical", label: "clássico", description: "prosa elegante, tradicional, de construção cuidadosa" },
  { id: "introspective", label: "introspectivo", description: "mergulho na consciência, fluxo de pensamento" },
  { id: "essayistic", label: "ensaístico", description: "argumentativo, reflexivo, analítico" },
  { id: "documentary", label: "documental", description: "jornalístico, factual, de testemunho" },
  { id: "fable", label: "fabular", description: "tom de fábula, alegoria ou parábola" },
] as const;

export const EXPERIENCES = [
  { id: "one_sitting", label: "para ler de uma sentada", description: "curto e envolvente, lê-se de uma vez" },
  { id: "slow_read", label: "para ler devagar", description: "pede leitura lenta, saboreando cada página" },
  { id: "lingering", label: "para pensar por dias", description: "deixa perguntas, continua depois do fim" },
  { id: "moving", label: "para se emocionar", description: "comove, faz chorar, toca fundo" },
  { id: "funny", label: "para rir", description: "diverte, faz rir" },
  { id: "gripping", label: "para perder o sono", description: "prende, dá medo ou ansiedade para saber o fim" },
  { id: "transporting", label: "para viajar longe", description: "transporta para outro lugar, época ou mundo" },
  { id: "relatable", label: "para se reconhecer", description: "espelha a vida comum, o leitor se vê ali" },
  { id: "challenging", label: "para desafiar certezas", description: "provoca, incomoda, muda o modo de ver" },
  { id: "consoling", label: "para se consolar", description: "acolhe, conforta em tempos difíceis" },
] as const;

export type StyleId = (typeof STYLES)[number]["id"];
export type ExperienceId = (typeof EXPERIENCES)[number]["id"];

export const STYLE_IDS = STYLES.map((style) => style.id) as StyleId[];
export const EXPERIENCE_IDS = EXPERIENCES.map((experience) => experience.id) as ExperienceId[];

export const STYLE_BY_ID = Object.fromEntries(STYLES.map((style) => [style.id, style])) as Record<
  StyleId,
  (typeof STYLES)[number]
>;
export const EXPERIENCE_BY_ID = Object.fromEntries(
  EXPERIENCES.map((experience) => [experience.id, experience]),
) as Record<ExperienceId, (typeof EXPERIENCES)[number]>;

export const GENRES = [
  "Romance",
  "Novela",
  "Contos",
  "Poesia",
  "Ensaio",
  "Crônica",
  "Memórias",
  "Reportagem",
  "Teatro",
  "Ficção científica",
  "Fantasia",
  "Policial",
  "Quadrinhos",
  "Infantojuvenil",
  "Não ficção",
] as const;

export function paceLabel(value: number | null | undefined): string | null {
  return PACE_LEVELS.find((level) => level.value === value)?.label ?? null;
}

export function densityLabel(value: number | null | undefined): string | null {
  return DENSITY_LEVELS.find((level) => level.value === value)?.label ?? null;
}

export function atmosphereLabel(id: string): string {
  return ATMOSPHERE_BY_ID[id as AtmosphereId]?.label ?? id;
}

export function styleLabel(id: string): string {
  return STYLE_BY_ID[id as StyleId]?.label ?? id;
}

export function experienceLabel(id: string): string {
  return EXPERIENCE_BY_ID[id as ExperienceId]?.label ?? id;
}

const CONFIDENCE_LABELS: Record<string, string> = { high: "alta", medium: "média", low: "baixa", none: "nenhuma" };

export function confidenceLabel(value: string | null | undefined): string {
  return value ? (CONFIDENCE_LABELS[value] ?? value) : "—";
}

export function attributeLabel(attribute: string): string {
  const key = attribute.trim().toLowerCase();
  return (
    ATMOSPHERE_BY_ID[key as AtmosphereId]?.label ??
    STYLE_BY_ID[key as StyleId]?.label ??
    EXPERIENCE_BY_ID[key as ExperienceId]?.label ??
    attribute
  );
}

export type SemanticProfile = {
  atmospheres: AtmosphereId[];
  pace: number | null;
  density: number | null;
  styles: StyleId[];
  experiences: ExperienceId[];
  themes: string[];
  portrait: string | null;
};

export function describeProfile(profile: SemanticProfile): string {
  const parts: string[] = [];
  if (profile.atmospheres.length > 0) {
    const detailed = profile.atmospheres
      .map((id) => `${ATMOSPHERE_BY_ID[id].label} (${ATMOSPHERE_BY_ID[id].description.split(",").slice(0, 3).join(",")})`)
      .join("; ");
    parts.push(`Atmosfera ${detailed}.`);
  }
  const pace = PACE_LEVELS.find((level) => level.value === profile.pace);
  if (pace) parts.push(`${pace.description[0].toUpperCase()}${pace.description.slice(1)}.`);
  const density = DENSITY_LEVELS.find((level) => level.value === profile.density);
  if (density) parts.push(`${density.description[0].toUpperCase()}${density.description.slice(1)}.`);
  if (profile.styles.length > 0) {
    parts.push(`Estilo ${profile.styles.map((id) => `${STYLE_BY_ID[id].label}: ${STYLE_BY_ID[id].description}`).join("; ")}.`);
  }
  if (profile.experiences.length > 0) {
    parts.push(
      `Um livro ${profile.experiences.map((id) => `${EXPERIENCE_BY_ID[id].label} (${EXPERIENCE_BY_ID[id].description})`).join("; ")}.`,
    );
  }
  if (profile.themes.length > 0) parts.push(`Temas: ${profile.themes.join(", ")}.`);
  if (profile.portrait) parts.push(profile.portrait);
  return parts.join(" ");
}
