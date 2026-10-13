import type { CSSProperties } from "react";
import type { SpineIdentity } from "@/lib/shelf/identity";

const BAND_THICKNESS = [0, 7, 3.5, 2.5, 1.75, 1.25];

export function PaceBands({ identity, scale = 1 }: { identity: SpineIdentity; scale?: number }) {
  if (!identity.classified || identity.bands === 0) {
    return (
      <span
        aria-hidden
        className="absolute inset-x-[22%] block border-t border-dashed"
        style={{ bottom: 12 * scale, borderColor: identity.ink, opacity: 0.5 }}
      />
    );
  }
  const thickness = BAND_THICKNESS[identity.bands] * scale;
  return (
    <span aria-hidden className="absolute inset-x-0 flex flex-col" style={{ bottom: 9 * scale, gap: 2.5 * scale }}>
      {Array.from({ length: identity.bands }, (_, index) => (
        <span key={index} className="block w-full" style={{ height: thickness, background: identity.accent }} />
      ))}
    </span>
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
  return (
    <span className={className} style={{ background: identity.color, color: identity.ink, ...style }}>
      <span className="spine-text" style={{ bottom: 30 * scale, top: 9 * scale, gap: 9 * scale }}>
        <span
          className={`spine-title face-${identity.face}`}
          data-lines={identity.titleLines}
          style={{ fontSize: identity.titleSize * scale }}
        >
          {identity.title}
        </span>
        <span className="spine-author" style={{ fontSize: 8.5 * Math.max(scale, 0.92) }}>
          {identity.author}
        </span>
      </span>
      <PaceBands identity={identity} scale={scale} />
    </span>
  );
}
