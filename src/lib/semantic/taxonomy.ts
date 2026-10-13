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
    label: "melancholic",
    noun: "melancholy",
    description: "gentle sadness, longing, loss, farewell, loneliness, emptiness, rain, late afternoon",
    color: "#34506b",
  },
  {
    id: "comforting",
    label: "comforting",
    noun: "warmth",
    description: "tenderness, affection, coziness, solace, reassurance, gentleness, friendship, care, human warmth",
    color: "#c56a45",
  },
  {
    id: "dark",
    label: "dark",
    noun: "shadow",
    description: "darkness, despair, death, violence, pessimism, oppression, heaviness, tragedy",
    color: "#211f1d",
  },
  {
    id: "luminous",
    label: "luminous",
    noun: "light",
    description: "hope, joy, lightness, optimism, enchantment, new beginnings, vitality",
    color: "#dba53a",
  },
  {
    id: "unsettling",
    label: "unsettling",
    noun: "unease",
    description: "strangeness, discomfort, disturbance, absurdity, diffuse threat, unease, paranoia",
    color: "#24483e",
  },
  {
    id: "ironic",
    label: "ironic",
    noun: "irony",
    description: "humor, satire, sarcasm, comedy, laughter, mockery, biting criticism",
    color: "#d2452f",
  },
  {
    id: "contemplative",
    label: "contemplative",
    noun: "contemplation",
    description: "silence, reflection, serenity, slowness, observation, philosophy, calm introspection",
    color: "#87957a",
  },
  {
    id: "intense",
    label: "intense",
    noun: "intensity",
    description: "passion, fury, desire, visceral feeling, rapture, extreme emotional conflict, obsession",
    color: "#7b1f2e",
  },
  {
    id: "dreamlike",
    label: "dreamlike",
    noun: "dream",
    description: "dream, fantasy, magical realism, the marvelous, fable, myth, imagination, the surreal",
    color: "#5d4b8b",
  },
  {
    id: "nostalgic",
    label: "nostalgic",
    noun: "nostalgia",
    description: "memory, childhood, the past, remembrance, lost time, longing for another era",
    color: "#c18f8a",
  },
  {
    id: "tense",
    label: "tense",
    noun: "tension",
    description: "suspense, danger, mystery, pursuit, investigation, urgency, fear",
    color: "#4b4f55",
  },
  {
    id: "raw",
    label: "raw",
    noun: "rawness",
    description: "dryness, harsh realism, poverty, hunger, social injustice, exposé, unadorned brutality",
    color: "#cdbd9b",
  },
];

export const ATMOSPHERE_IDS = ATMOSPHERES.map((atmosphere) => atmosphere.id);
export const ATMOSPHERE_BY_ID = Object.fromEntries(
  ATMOSPHERES.map((atmosphere) => [atmosphere.id, atmosphere]),
) as Record<AtmosphereId, Atmosphere>;

export const PACE_LEVELS = [
  { value: 1, label: "slow", description: "slow, lingering pace, with long sentences and little action" },
  { value: 2, label: "unhurried", description: "unhurried pace that moves along without rushing" },
  { value: 3, label: "flowing", description: "flowing, balanced pace" },
  { value: 4, label: "brisk", description: "brisk pace, short chapters, plenty of action" },
  { value: 5, label: "breakneck", description: "breakneck, frantic pace, impossible to put down" },
] as const;

export const DENSITY_LEVELS = [
  { value: 1, label: "light", description: "light, accessible read" },
  { value: 2, label: "balanced", description: "read of balanced density" },
  { value: 3, label: "dense", description: "dense read that asks for attention" },
  { value: 4, label: "demanding", description: "demanding read: complex, experimental or erudite" },
] as const;

export const STYLES = [
  { id: "lyrical", label: "lyrical", description: "poetic, musical language, full of imagery" },
  { id: "spare", label: "spare", description: "short, direct sentences, no ornament" },
  { id: "wry", label: "wry", description: "ironic, witty narrator who plays with the reader" },
  { id: "experimental", label: "experimental", description: "inventive, fragmented or unconventional form" },
  { id: "colloquial", label: "colloquial", description: "oral, popular voice, close to speech" },
  { id: "classical", label: "classical", description: "elegant, traditional, carefully built prose" },
  { id: "introspective", label: "introspective", description: "a dive into consciousness, stream of thought" },
  { id: "essayistic", label: "essayistic", description: "argumentative, reflective, analytical" },
  { id: "documentary", label: "documentary", description: "journalistic, factual, testimonial" },
  { id: "fable", label: "fable-like", description: "the tone of a fable, allegory or parable" },
] as const;

export const EXPERIENCES = [
  { id: "one_sitting", label: "to read in one sitting", description: "short and absorbing, read in one go" },
  { id: "slow_read", label: "to read slowly", description: "asks for slow reading, savoring each page" },
  { id: "lingering", label: "to think about for days", description: "leaves questions, goes on after the ending" },
  { id: "moving", label: "to be moved", description: "touching, brings tears, strikes deep" },
  { id: "funny", label: "to laugh", description: "entertaining, makes you laugh" },
  { id: "gripping", label: "to lose sleep over", description: "gripping, makes you afraid or anxious to know the ending" },
  { id: "transporting", label: "to travel far", description: "carries you to another place, time or world" },
  { id: "relatable", label: "to recognize yourself", description: "mirrors ordinary life, readers see themselves in it" },
  { id: "challenging", label: "to challenge certainties", description: "provokes, unsettles, changes how you see things" },
  { id: "consoling", label: "to find comfort", description: "welcoming, comforting in hard times" },
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
  "Novel",
  "Novella",
  "Short stories",
  "Poetry",
  "Essay",
  "Chronicles",
  "Memoir",
  "Reportage",
  "Theater",
  "Science fiction",
  "Fantasy",
  "Crime",
  "Comics",
  "Young readers",
  "Nonfiction",
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

export function confidenceLabel(value: string | null | undefined): string {
  return value || "—";
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
    parts.push(`Atmosphere: ${detailed}.`);
  }
  const pace = PACE_LEVELS.find((level) => level.value === profile.pace);
  if (pace) parts.push(`${pace.description[0].toUpperCase()}${pace.description.slice(1)}.`);
  const density = DENSITY_LEVELS.find((level) => level.value === profile.density);
  if (density) parts.push(`${density.description[0].toUpperCase()}${density.description.slice(1)}.`);
  if (profile.styles.length > 0) {
    parts.push(`Style: ${profile.styles.map((id) => `${STYLE_BY_ID[id].label} (${STYLE_BY_ID[id].description})`).join("; ")}.`);
  }
  if (profile.experiences.length > 0) {
    parts.push(
      `A book ${profile.experiences.map((id) => `${EXPERIENCE_BY_ID[id].label} (${EXPERIENCE_BY_ID[id].description})`).join("; ")}.`,
    );
  }
  if (profile.themes.length > 0) parts.push(`Themes: ${profile.themes.join(", ")}.`);
  if (profile.portrait) parts.push(profile.portrait);
  return parts.join(" ");
}
