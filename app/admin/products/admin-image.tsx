"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";

type AdminImageProps = {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
};

export default function AdminImage({
  src,
  alt,
  fill = false,
  width,
  height,
  sizes,
  className,
}: AdminImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const isCloudinaryImage = src.startsWith("https://res.cloudinary.com/");
  const fallbackStyle: CSSProperties | undefined = fill
    ? {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }
    : undefined;

  if (failedSource === src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} width={width} height={height} sizes={sizes} className={className} style={fallbackStyle} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      sizes={sizes}
      className={className}
      unoptimized={!isCloudinaryImage}
      onError={() => setFailedSource(src)}
    />
  );
}
