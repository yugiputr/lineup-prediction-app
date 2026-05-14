"use client";

import Image from "next/image";
import { useState } from "react";

export function ImageWithFallback({
  src,
  alt,
  size = 40,
  className = "",
  fallbackLabel,
}: {
  src: string | null;
  alt: string;
  size?: number;
  className?: string;
  fallbackLabel?: string;
}) {
  const [failed, setFailed] = useState(!src);

  if (!src || failed) {
    return (
      <div
        className={`grid place-items-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-600 ${className}`}
        style={{ width: size, height: size }}
        aria-label={alt}
      >
        {(fallbackLabel ?? alt).slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full object-contain ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
