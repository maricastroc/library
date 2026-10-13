import type { CSSProperties, ReactNode } from "react";
import type { ImprintMark, Ornament, SpineIdentity } from "@/lib/shelf/identity";

const BAND_THICKNESS = [0, 7, 3.5, 2.5, 1.75, 1.25];
const STACK_LINE = 1.1;

function Rules({
  count,
  thickness,
  gap,
  color,
  className = "",
  style,
}: {
  count: number;
  thickness: number;
  gap: number;
  color: string;
  className?: string;
  style?: CSSProperties;
}) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden
      className={`block ${className}`}
      style={{
        height: count * thickness + (count - 1) * gap,
        background: `repeating-linear-gradient(to bottom, ${color} 0 ${thickness}px, transparent ${thickness}px ${thickness + gap}px)`,
        ...style,
      }}
    />
  );
}

function OrnamentGlyph({ kind, size, color }: { kind: Ornament; size: number; color: string }) {
  return <span aria-hidden className="spine-ornament" data-kind={kind} style={{ width: size, height: size, color }} />;
}

function Mark({ kind, size, color }: { kind: ImprintMark; size: number; color: string }) {
  return <span aria-hidden className="spine-mark" data-kind={kind} style={{ width: size, height: size, color }} />;
}

function Zone({ top, bottom, height, children, className = "" }: { top?: number | string; bottom?: number | string; height?: number | string; children: ReactNode; className?: string }) {
  return (
    <span aria-hidden className={`absolute inset-x-0 flex items-center justify-center ${className}`} style={{ top, bottom, height }}>
      {children}
    </span>
  );
}

function Author({ identity, scale, across, size }: { identity: SpineIdentity; scale: number; across: boolean; size?: number }) {
  const base = size ?? (across ? 8 : identity.authorSize);
  return (
    <span className="spine-author" data-across={across ? "true" : undefined} style={{ fontSize: base * Math.max(scale, 0.92) }}>
      {identity.author}
    </span>
  );
}

function Text({
  identity,
  scale,
  top,
  bottom,
  color,
  author = true,
}: {
  identity: SpineIdentity;
  scale: number;
  top: number;
  bottom: number;
  color?: string;
  author?: boolean;
}) {
  return (
    <span
      className="spine-text"
      data-orientation={identity.orientation}
      data-align={identity.align}
      style={{ top: top * scale, bottom: bottom * scale, gap: 9 * scale, color }}
    >
      <span className={`spine-title face-${identity.face}`} data-lines={identity.titleLines} style={{ fontSize: identity.titleSize * scale }}>
        {identity.title}
      </span>
      {author ? <Author identity={identity} scale={scale} across={identity.authorAcross} /> : null}
    </span>
  );
}

function Stack({ identity, scale }: { identity: SpineIdentity; scale: number }) {
  return (
    <span className={`spine-stack face-${identity.face}`} style={{ fontSize: identity.titleSize * scale, lineHeight: STACK_LINE }}>
      {identity.stack?.map((line, index) => (
        <span key={index}>{line}</span>
      ))}
    </span>
  );
}

function Rib({ at }: { at: number }) {
  return <span aria-hidden className="spine-rib" style={{ top: `${at}%` }} />;
}

function Leather({ identity, scale }: { identity: SpineIdentity; scale: number }) {
  const rules = (
    <Zone top="84%" bottom={0}>
      <Rules count={identity.bands} thickness={1} gap={2 * scale} color={identity.foil} style={{ width: "58%" }} />
    </Zone>
  );
  if (!identity.stack) {
    return (
      <>
        <Rib at={8} />
        <Text identity={identity} scale={scale} top={identity.head} bottom={identity.foot} />
        <Rib at={84} />
        {rules}
      </>
    );
  }
  return (
    <>
      <Rib at={8} />
      <Zone top="calc(8% + 6px)" height="calc(38% - 8px)">
        <span className="spine-label" style={{ background: identity.panel, color: identity.panelInk }}>
          <Stack identity={identity} scale={scale} />
        </span>
      </Zone>
      <Rib at={46} />
      {identity.authorAcross ? (
        <>
          <Zone top="calc(46% + 5px)" height="calc(20% - 5px)">
            <OrnamentGlyph kind={identity.ornament} size={8 * scale} color={identity.foil} />
          </Zone>
          <Rib at={66} />
          <Zone top="calc(66% + 5px)" height="calc(18% - 5px)">
            <Author identity={identity} scale={scale} across size={7.5} />
          </Zone>
        </>
      ) : (
        <span className="spine-text" data-orientation="down" style={{ top: "calc(46% + 9px)", bottom: "calc(16% + 4px)" }}>
          <span className="flex-1" />
          <Author identity={identity} scale={scale} across={false} />
        </span>
      )}
      <Rib at={84} />
      {rules}
    </>
  );
}

function Cloth({ identity, scale }: { identity: SpineIdentity; scale: number }) {
  return (
    <>
      <span aria-hidden className="spine-fillet" style={{ top: 6 * scale, height: 5 * scale, color: identity.foil }} />
      <Zone top={14 * scale} height={9 * scale}>
        <OrnamentGlyph kind={identity.ornament} size={7 * scale} color={identity.foil} />
      </Zone>
      {identity.labelled ? (
        <span
          aria-hidden
          className="spine-paper-label"
          style={{
            top: (identity.head - 2) * scale,
            bottom: (identity.foot + identity.authorReserve + 3) * scale,
            background: identity.panel,
          }}
        />
      ) : null}
      {identity.labelled ? (
        <span
          className="spine-text"
          data-orientation="down"
          data-align="center"
          style={{ top: identity.head * scale, bottom: identity.foot * scale, gap: 9 * scale }}
        >
          <span
            className={`spine-title face-${identity.face}`}
            data-lines={identity.titleLines}
            style={{ fontSize: identity.titleSize * scale, color: identity.panelInk }}
          >
            {identity.title}
          </span>
          <Author identity={identity} scale={scale} across={identity.authorAcross} />
        </span>
      ) : (
        <Text identity={identity} scale={scale} top={identity.head} bottom={identity.foot} />
      )}
      <Rules
        count={identity.bands}
        thickness={1}
        gap={2 * scale}
        color={identity.foil}
        className="absolute inset-x-[20%]"
        style={{ bottom: 12 * scale }}
      />
      <span aria-hidden className="spine-fillet" data-flip="true" style={{ bottom: 5 * scale, height: 5 * scale, color: identity.foil }} />
    </>
  );
}

function Banded({ identity, scale }: { identity: SpineIdentity; scale: number }) {
  return (
    <>
      <span
        aria-hidden
        className="spine-panel"
        style={{ top: identity.head * scale, bottom: identity.foot * scale, background: identity.panel }}
      />
      <Zone top={0} height={identity.head * scale}>
        <Rules count={identity.bands} thickness={1.5 * scale} gap={2.5 * scale} color={identity.ink} style={{ width: "56%" }} />
      </Zone>
      <Text identity={identity} scale={scale} top={identity.head + 7} bottom={identity.foot + 5} color={identity.panelInk} />
      <Zone bottom={0} height={identity.foot * scale}>
        <Mark kind={identity.mark} size={9 * scale} color={identity.ink} />
      </Zone>
    </>
  );
}

function Trade({ identity, scale }: { identity: SpineIdentity; scale: number }) {
  return (
    <>
      <Text identity={identity} scale={scale} top={identity.head} bottom={identity.foot} />
      <Rules
        count={identity.bands}
        thickness={BAND_THICKNESS[identity.bands] * scale}
        gap={2.5 * scale}
        color={identity.accent}
        className="absolute inset-x-0"
        style={{ bottom: 9 * scale }}
      />
    </>
  );
}

function Minimal({ identity, scale }: { identity: SpineIdentity; scale: number }) {
  return (
    <>
      <Text identity={identity} scale={scale} top={identity.head} bottom={identity.foot} />
      <Rules
        count={identity.bands}
        thickness={1}
        gap={2.5 * scale}
        color={identity.ink}
        className="absolute inset-x-[30%] opacity-80"
        style={{ bottom: 27 * scale }}
      />
      <Zone bottom={0} height={21 * scale} className="spine-strip">
        <span className="absolute inset-0" style={{ background: identity.panel }} />
        <span className="relative">
          <Mark kind={identity.mark} size={8 * scale} color={identity.panelInk} />
        </span>
      </Zone>
    </>
  );
}

function Wrapper({ identity, scale, frame }: { identity: SpineIdentity; scale: number; frame: string }) {
  const bandeau = (identity.foot - 16) * scale;
  return (
    <>
      <span aria-hidden className="spine-frame" style={{ inset: 2.5 * scale, borderColor: frame }} />
      <span aria-hidden className="absolute" style={{ top: 7 * scale, left: 6 * scale, right: 6 * scale, height: 5 * scale, background: identity.color }} />
      <Rules
        count={identity.bands}
        thickness={1}
        gap={2 * scale}
        color={frame}
        className="absolute"
        style={{ top: 15 * scale, left: 6 * scale, right: 6 * scale }}
      />
      <Text identity={identity} scale={scale} top={identity.head} bottom={identity.foot} color={identity.panelInk} author={false} />
      <span
        className="spine-bandeau"
        style={{ bottom: 9 * scale, height: bandeau, background: identity.color, color: identity.ink }}
      >
        <Author identity={identity} scale={scale} across={identity.authorAcross} size={7.5} />
      </span>
    </>
  );
}

function Pocket({ identity, scale }: { identity: SpineIdentity; scale: number }) {
  return (
    <>
      <Zone top={0} height={20 * scale} className="spine-plate">
        <span className="absolute inset-0" style={{ background: identity.panel }} />
        <span className="relative font-mono font-medium" style={{ fontSize: 7 * Math.max(scale, 0.92), color: identity.panelInk, letterSpacing: "0.06em" }}>
          {identity.number}
        </span>
      </Zone>
      <Text identity={identity} scale={scale} top={identity.head} bottom={identity.foot} />
      <Rules
        count={identity.bands}
        thickness={1.5 * scale}
        gap={2 * scale}
        color={identity.ink}
        className="absolute inset-x-0 opacity-90"
        style={{ bottom: 14 * scale }}
      />
      <span aria-hidden className="spine-hatch" style={{ height: 9 * scale, color: identity.ink }} />
    </>
  );
}

function Jacket({ identity, scale }: { identity: SpineIdentity; scale: number }) {
  const stripe = <span aria-hidden className="absolute inset-y-0 left-0" style={{ width: 3 * scale, background: identity.accent }} />;
  const bands = (
    <Rules
      count={identity.bands}
      thickness={BAND_THICKNESS[identity.bands] * scale}
      gap={2.5 * scale}
      color={identity.accent}
      className="absolute right-0"
      style={{ bottom: 9 * scale, left: 3 * scale }}
    />
  );
  if (!identity.stack) {
    return (
      <>
        {stripe}
        <Text identity={identity} scale={scale} top={identity.head} bottom={identity.foot} />
        {bands}
      </>
    );
  }
  const stackHeight = identity.stack.length * identity.titleSize * STACK_LINE;
  return (
    <>
      {stripe}
      <span className="absolute" style={{ top: 13 * scale, left: 5 * scale, right: 2 * scale }}>
        <Stack identity={identity} scale={scale} />
      </span>
      <span
        className="spine-text"
        data-orientation="down"
        style={{ top: (13 + stackHeight + 10) * scale, bottom: identity.foot * scale, left: 3 * scale }}
      >
        <span className="flex-1" />
        <Author identity={identity} scale={scale} across={identity.authorAcross} />
      </span>
      {bands}
    </>
  );
}

function Kraft({ identity, scale }: { identity: SpineIdentity; scale: number }) {
  return (
    <>
      <Text identity={identity} scale={scale} top={identity.head} bottom={identity.foot} />
      <span aria-hidden className="spine-twine" style={{ bottom: 12 * scale, borderColor: identity.ink }} />
    </>
  );
}

export function SpineFace({
  identity,
  scale = 1,
  className = "spine-body",
  style,
}: {
  identity: SpineIdentity;
  scale?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const wrapper = identity.binding === "wrapper";
  let content: ReactNode;
  switch (identity.binding) {
    case "leather":
      content = <Leather identity={identity} scale={scale} />;
      break;
    case "cloth":
      content = <Cloth identity={identity} scale={scale} />;
      break;
    case "banded":
      content = <Banded identity={identity} scale={scale} />;
      break;
    case "minimal":
      content = <Minimal identity={identity} scale={scale} />;
      break;
    case "wrapper":
      content = <Wrapper identity={identity} scale={scale} frame={identity.accent} />;
      break;
    case "pocket":
      content = <Pocket identity={identity} scale={scale} />;
      break;
    case "jacket":
      content = <Jacket identity={identity} scale={scale} />;
      break;
    case "kraft":
      content = <Kraft identity={identity} scale={scale} />;
      break;
    default:
      content = <Trade identity={identity} scale={scale} />;
  }
  return (
    <span
      className={`spine-face ${className}`}
      data-binding={identity.binding}
      data-worn={identity.worn ? "true" : undefined}
      style={{ background: wrapper ? identity.panel : identity.color, color: wrapper ? identity.panelInk : identity.ink, ...style }}
    >
      {content}
    </span>
  );
}
