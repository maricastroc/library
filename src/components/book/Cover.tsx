import type { SpineIdentity } from "@/lib/shelf/identity";

const COVER_FACE: Record<SpineIdentity["face"], string> = {
  serif: "font-display font-[560] tracking-[-0.03em] [font-variation-settings:'SOFT'_0,'WONK'_0]",
  italic: "font-display italic font-[430] tracking-[-0.02em] [font-variation-settings:'SOFT'_80,'WONK'_1]",
  grotesque: "font-label font-extrabold uppercase tracking-[-0.01em] [font-variation-settings:'wdth'_76]",
  mono: "font-mono font-medium uppercase tracking-[-0.02em]",
  soft: "font-display font-[660] tracking-[-0.02em] [font-variation-settings:'SOFT'_100,'WONK'_1]",
};

function titleSize(title: string, face: SpineIdentity["face"]): number {
  const longest = Math.max(...title.split(/\s+/).map((word) => word.length));
  const length = title.length;
  let size = length <= 8 ? 23 : length <= 14 ? 18 : length <= 22 ? 14.5 : length <= 34 ? 11.5 : length <= 48 ? 9.6 : 8.2;
  const widthFactor = face === "mono" ? 0.64 : face === "grotesque" ? 0.6 : 0.56;
  const maxForLongestWord = 86 / (longest * widthFactor);
  size = Math.min(size, maxForLongestWord);
  if (face === "mono") size *= 0.86;
  return Number(size.toFixed(2));
}

const BAND_HEIGHT = [0, 5.2, 2.6, 1.8, 1.25, 0.9];

export function Cover({
  title,
  author,
  genre,
  identity,
  shopName,
}: {
  title: string;
  author: string;
  genre: string | null;
  identity: SpineIdentity;
  shopName: string;
}) {
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: identity.color, color: identity.ink, containerType: "size" }}
    >
      <div className="absolute flex flex-col" style={{ inset: "7cqw" }}>
        <div className="flex items-start justify-between" style={{ gap: "4cqw" }}>
          <p className="eyebrow" style={{ fontSize: "2.7cqw", letterSpacing: "0.12em" }}>
            {author}
          </p>
          {genre ? (
            <p className="eyebrow shrink-0 text-right opacity-80" style={{ fontSize: "2.3cqw", letterSpacing: "0.12em" }}>
              {genre}
            </p>
          ) : null}
        </div>
        <p
          className={`${COVER_FACE[identity.face]} text-balance`}
          style={{ marginTop: "9cqw", fontSize: `${titleSize(title, identity.face)}cqw`, lineHeight: 0.94, hyphens: "manual" }}
        >
          {title}
        </p>
        <div className="mt-auto">
          {identity.classified && identity.bands > 0 ? (
            <div aria-hidden className="flex flex-col" style={{ gap: "1.5cqw", marginBottom: "5cqw" }}>
              {Array.from({ length: identity.bands }, (_, index) => (
                <span
                  key={index}
                  className="block w-full"
                  style={{ height: `${BAND_HEIGHT[identity.bands]}cqw`, background: identity.accent }}
                />
              ))}
            </div>
          ) : (
            <div aria-hidden className="border-t border-dashed" style={{ borderColor: identity.ink, opacity: 0.5, marginBottom: "5cqw" }} />
          )}
          <p className="display-italic" style={{ fontSize: "3.4cqw" }}>
            {shopName}
          </p>
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[2.2cqw] bg-black/10" />
    </div>
  );
}
