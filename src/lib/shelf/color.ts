export type Rgb = { r: number; g: number; b: number };
type Lab = { l: number; a: number; b: number };

export const PAPER = "#f3ecdd";
export const INK = "#1c1a17";

export function hexToRgb(hex: string): Rgb {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const part = (channel: number) => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

function toLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function fromLinear(value: number): number {
  const clamped = Math.min(1, Math.max(0, value));
  return (clamped <= 0.0031308 ? clamped * 12.92 : 1.055 * clamped ** (1 / 2.4) - 0.055) * 255;
}

function rgbToLab(rgb: Rgb): Lab {
  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function labToRgb(lab: Lab): Rgb {
  const l = (lab.l + 0.3963377774 * lab.a + 0.2158037573 * lab.b) ** 3;
  const m = (lab.l - 0.1055613458 * lab.a - 0.0638541728 * lab.b) ** 3;
  const s = (lab.l - 0.0894841775 * lab.a - 1.291485548 * lab.b) ** 3;
  return {
    r: fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

export function mixColors(first: string, second: string, amount: number): string {
  const a = rgbToLab(hexToRgb(first));
  const b = rgbToLab(hexToRgb(second));
  return rgbToHex(
    labToRgb({
      l: a.l + (b.l - a.l) * amount,
      a: a.a + (b.a - a.a) * amount,
      b: a.b + (b.b - a.b) * amount,
    }),
  );
}

export function shiftLightness(hex: string, delta: number): string {
  const lab = rgbToLab(hexToRgb(hex));
  return rgbToHex(labToRgb({ ...lab, l: Math.min(0.97, Math.max(0.12, lab.l + delta)) }));
}

export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrastRatio(first: string, second: string): number {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function readableInk(background: string): { background: string; ink: string } {
  let current = background;
  for (let step = 0; step < 8; step += 1) {
    const onPaper = contrastRatio(current, PAPER);
    const onInk = contrastRatio(current, INK);
    if (Math.max(onPaper, onInk) >= 4.6) return { background: current, ink: onPaper >= onInk ? PAPER : INK };
    current = shiftLightness(current, onPaper >= onInk ? -0.03 : 0.03);
  }
  return { background: current, ink: contrastRatio(current, PAPER) >= contrastRatio(current, INK) ? PAPER : INK };
}
