import type { CSSProperties, ReactNode } from "react";
import type { SpineIdentity } from "@/lib/shelf/identity";

const COVER_FACE: Record<SpineIdentity["face"], string> = {
  serif: "font-display font-[560] tracking-[-0.03em] [font-variation-settings:'SOFT'_0,'WONK'_0]",
  italic: "font-display italic font-[430] tracking-[-0.02em] [font-variation-settings:'SOFT'_80,'WONK'_1]",
  grotesque: "font-label font-extrabold uppercase tracking-[-0.01em] [font-variation-settings:'wdth'_76]",
  mono: "font-mono font-medium uppercase tracking-[-0.02em]",
  soft: "font-display font-[660] tracking-[-0.02em] [font-variation-settings:'SOFT'_100,'WONK'_1]",
  hand: "font-hand font-semibold tracking-[0]",
};

function titleSize(title: string, face: SpineIdentity["face"], room = 86): number {
  const longest = Math.max(...title.split(/\s+/).map((word) => word.length));
  const length = title.length;
  let size = length <= 8 ? 23 : length <= 14 ? 18 : length <= 22 ? 14.5 : length <= 34 ? 11.5 : length <= 48 ? 9.6 : 8.2;
  const widthFactor = face === "mono" ? 0.64 : face === "grotesque" ? 0.6 : 0.56;
  size = Math.min(size, room / (longest * widthFactor));
  if (face === "mono") size *= 0.86;
  if (face === "hand") size *= 1.2;
  return Number(size.toFixed(2));
}

const BAND_HEIGHT = [0, 5.2, 2.6, 1.8, 1.25, 0.9];

type CoverProps = {
  title: string;
  author: string;
  genre: string | null;
  identity: SpineIdentity;
  shopName: string;
};

function Rules({ identity, color, thin = false, style }: { identity: SpineIdentity; color: string; thin?: boolean; style?: CSSProperties }) {
  if (!identity.classified || identity.bands === 0) return null;
  const height = thin ? 0.45 : BAND_HEIGHT[identity.bands];
  return (
    <div aria-hidden className="flex flex-col" style={{ gap: thin ? "1.1cqw" : "1.5cqw", ...style }}>
      {Array.from({ length: identity.bands }, (_, index) => (
        <span key={index} className="block w-full" style={{ height: `${height}cqw`, background: color }} />
      ))}
    </div>
  );
}

function Title({ title, identity, room, className = "", style }: { title: string; identity: SpineIdentity; room?: number; className?: string; style?: CSSProperties }) {
  return (
    <p
      className={`${COVER_FACE[identity.face]} text-balance ${className}`}
      style={{ fontSize: `${titleSize(title, identity.face, room)}cqw`, lineHeight: 0.96, hyphens: "manual", ...style }}
    >
      {title}
    </p>
  );
}

function Small({ children, className = "", size = 2.7, style }: { children: ReactNode; className?: string; size?: number; style?: CSSProperties }) {
  return (
    <p className={`eyebrow ${className}`} style={{ fontSize: `${size}cqw`, letterSpacing: "0.12em", ...style }}>
      {children}
    </p>
  );
}

function Classic({ title, author, identity, shopName }: CoverProps) {
  return (
    <div className="absolute flex flex-col items-center text-center" style={{ inset: "6cqw", border: `0.5cqw solid ${identity.foil}`, padding: "1.2cqw" }}>
      <div className="flex h-full w-full flex-col items-center" style={{ border: `0.2cqw solid ${identity.foil}`, padding: "7cqw 5cqw 5cqw" }}>
        <span aria-hidden className="spine-ornament" data-kind={identity.ornament} style={{ width: "5cqw", height: "5cqw", color: identity.foil }} />
        <Title title={title} identity={identity} room={66} style={{ marginTop: "8cqw" }} />
        <span aria-hidden className="block" style={{ width: "14cqw", height: "0.3cqw", margin: "6cqw 0 5cqw", background: identity.foil }} />
        <Small>{author}</Small>
        <div className="mt-auto flex w-full flex-col items-center">
          <Rules identity={identity} color={identity.foil} thin style={{ width: "30cqw", marginBottom: "5cqw" }} />
          <p className="display-italic" style={{ fontSize: "3.2cqw" }}>
            {shopName}
          </p>
        </div>
      </div>
    </div>
  );
}

function Banded({ title, author, identity, shopName }: CoverProps) {
  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="flex items-center justify-center" style={{ height: "24%" }}>
        <Rules identity={identity} color={identity.ink} thin style={{ width: "34cqw" }} />
      </div>
      <div
        className="flex flex-1 flex-col items-center justify-center text-center"
        style={{ background: identity.panel, color: identity.panelInk, padding: "0 8cqw", boxShadow: "inset 0 0.3cqw 0 rgb(28 26 23 / 0.3), inset 0 -0.3cqw 0 rgb(28 26 23 / 0.3)" }}
      >
        <Title title={title} identity={identity} room={74} />
        <Small style={{ marginTop: "6cqw" }}>{author}</Small>
      </div>
      <div className="flex flex-col items-center justify-center" style={{ height: "20%", gap: "2.5cqw" }}>
        <span aria-hidden className="spine-mark" data-kind={identity.mark} style={{ width: "5cqw", height: "5cqw", color: identity.ink }} />
        <p className="display-italic" style={{ fontSize: "3cqw" }}>
          {shopName}
        </p>
      </div>
    </div>
  );
}

function Wrapper({ title, author, identity, shopName }: CoverProps) {
  return (
    <div className="absolute inset-0" style={{ background: identity.panel, color: identity.panelInk }}>
      <div className="absolute flex flex-col items-center text-center" style={{ inset: "5cqw", border: `0.3cqw solid ${identity.accent}`, padding: "9cqw 6cqw 6cqw" }}>
        <Rules identity={identity} color={identity.accent} thin style={{ width: "16cqw" }} />
        <Title title={title} identity={identity} room={70} style={{ marginTop: "10cqw" }} />
        <p className="display-italic mt-auto" style={{ fontSize: "3cqw", marginBottom: "30cqw" }}>
          {shopName}
        </p>
      </div>
      <div
        className="absolute inset-x-0 flex items-center justify-center"
        style={{ bottom: "13cqw", height: "20cqw", background: identity.color, color: identity.ink, boxShadow: "0 0.4cqw 0.8cqw rgb(28 26 23 / 0.2)" }}
      >
        <Small size={3.1}>{author}</Small>
      </div>
    </div>
  );
}

function Minimal({ title, author, identity, shopName }: CoverProps) {
  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="flex-1" style={{ padding: "9cqw 8cqw 0" }}>
        <Title title={title} identity={identity} room={62} className="!normal-case" style={{ fontSize: `${Math.min(13, titleSize(title, identity.face, 70))}cqw`, letterSpacing: "-0.02em" }} />
        <p className="font-label" style={{ marginTop: "4cqw", fontSize: "3.6cqw", opacity: 0.8 }}>
          {author}
        </p>
        <Rules identity={identity} color={identity.ink} thin style={{ width: "9cqw", marginTop: "8cqw" }} />
      </div>
      <div className="flex items-center justify-between" style={{ height: "15%", padding: "0 8cqw", background: identity.panel, color: identity.panelInk }}>
        <p className="display-italic" style={{ fontSize: "3.2cqw" }}>
          {shopName}
        </p>
        <span aria-hidden className="spine-mark" data-kind={identity.mark} style={{ width: "4.6cqw", height: "4.6cqw" }} />
      </div>
    </div>
  );
}

function Pocket({ title, author, identity, shopName }: CoverProps) {
  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="flex items-center justify-between" style={{ height: "13%", padding: "0 7cqw", background: identity.panel, color: identity.panelInk }}>
        <Small size={2.6}>{shopName}</Small>
        <Small size={2.6}>No. {identity.number}</Small>
      </div>
      <div className="flex flex-1 flex-col" style={{ padding: "9cqw 7cqw 0" }}>
        <Title title={title} identity={identity} room={80} />
        <Small style={{ marginTop: "6cqw" }}>{author}</Small>
        <Rules identity={identity} color={identity.ink} thin style={{ marginTop: "auto", marginBottom: "6cqw" }} />
      </div>
      <span aria-hidden className="spine-hatch !static block" style={{ height: "9%", color: identity.ink }} />
    </div>
  );
}

function Jacket({ title, author, genre, identity, shopName }: CoverProps) {
  return (
    <>
      <span aria-hidden className="absolute inset-y-0 left-0" style={{ width: "5cqw", background: identity.accent }} />
      <div className="absolute flex flex-col" style={{ inset: "8cqw 7cqw 7cqw 12cqw" }}>
        {genre ? <Small className="opacity-80">{genre}</Small> : null}
        <Title title={title} identity={identity} room={76} style={{ marginTop: "7cqw" }} />
        <div className="mt-auto">
          <Rules identity={identity} color={identity.accent} style={{ marginBottom: "6cqw" }} />
          <div className="flex items-end justify-between" style={{ gap: "4cqw" }}>
            <Small size={3}>{author}</Small>
            <p className="display-italic shrink-0" style={{ fontSize: "3.2cqw" }}>
              {shopName}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function Kraft({ title, author, identity }: CoverProps) {
  return (
    <>
      <span aria-hidden className="absolute inset-x-0 border-t border-dashed" style={{ top: "62%", borderColor: identity.ink, opacity: 0.5 }} />
      <span aria-hidden className="absolute inset-y-0 border-l border-dashed" style={{ left: "30%", borderColor: identity.ink, opacity: 0.5 }} />
      <div className="absolute" style={{ left: "12cqw", right: "10cqw", top: "14cqw", rotate: "-2deg", padding: "6cqw", background: "#f6f1e6", color: "#1c1a17", boxShadow: "0 1cqw 2cqw rgb(28 26 23 / 0.25)" }}>
        <Title title={title} identity={identity} room={56} />
        <Small style={{ marginTop: "4cqw" }}>{author}</Small>
      </div>
    </>
  );
}

function Trade({ title, author, genre, identity, shopName }: CoverProps) {
  return (
    <div className="absolute flex flex-col" style={{ inset: "7cqw" }}>
      <div className="flex items-start justify-between" style={{ gap: "4cqw" }}>
        <Small>{author}</Small>
        {genre ? (
          <Small className="shrink-0 text-right opacity-80" size={2.3}>
            {genre}
          </Small>
        ) : null}
      </div>
      <Title title={title} identity={identity} style={{ marginTop: "9cqw", textAlign: identity.align === "center" ? "center" : undefined }} />
      <div className="mt-auto">
        <Rules identity={identity} color={identity.accent} style={{ marginBottom: "5cqw" }} />
        <p className="display-italic" style={{ fontSize: "3.4cqw" }}>
          {shopName}
        </p>
      </div>
    </div>
  );
}

export function Cover(props: CoverProps) {
  const { identity } = props;
  let content: ReactNode;
  switch (identity.binding) {
    case "leather":
    case "cloth":
      content = <Classic {...props} />;
      break;
    case "banded":
      content = <Banded {...props} />;
      break;
    case "wrapper":
      content = <Wrapper {...props} />;
      break;
    case "minimal":
      content = <Minimal {...props} />;
      break;
    case "pocket":
      content = <Pocket {...props} />;
      break;
    case "jacket":
      content = <Jacket {...props} />;
      break;
    case "kraft":
      content = <Kraft {...props} />;
      break;
    default:
      content = <Trade {...props} />;
  }
  return (
    <div
      className="cover-face relative h-full w-full overflow-hidden"
      data-binding={identity.binding}
      style={{ background: identity.color, color: identity.ink, containerType: "size" }}
    >
      {content}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[2.2cqw] bg-black/10" />
    </div>
  );
}
