function getConfiguredBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL?.trim();
}

export function getAbsoluteImageUrl(imageUrl: string, fallbackBaseUrl?: string) {
  const configuredBaseUrl = getConfiguredBaseUrl();
  const vercelUrl = process.env.VERCEL_URL?.trim();
  const baseUrl = configuredBaseUrl
    ?? (typeof window !== "undefined" ? window.location.origin : undefined)
    ?? fallbackBaseUrl
    ?? (vercelUrl ? `https://${vercelUrl}` : undefined);
  if (!baseUrl) return imageUrl;

  return new URL(imageUrl, baseUrl).toString();
}
