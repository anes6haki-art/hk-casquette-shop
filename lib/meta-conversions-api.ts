import "server-only";

import { createHash } from "node:crypto";
import { createPurchaseEvent, META_PIXEL_ID } from "./meta-purchase";

const META_GRAPH_API_VERSION = "v27.0";
const META_CONVERSIONS_API_TIMEOUT_MS = 8000;

function hashPhoneNumber(phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0/, "");
  const normalizedPhone = digits.startsWith("213") ? digits : `213${digits}`;
  return createHash("sha256").update(normalizedPhone).digest("hex");
}

function normalizeEventSourceUrl(sourceUrl: string) {
  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}

export async function sendPurchaseToConversionsApi(
  order: { id: string; totalPrice: number },
  phone: string,
  sourceUrl: string | null,
) {
  const event = createPurchaseEvent(order);
  if (!event.event_id || !Number.isSafeInteger(event.value) || event.value <= 0) {
    console.error("[Meta CAPI] Skipped Purchase with invalid saved order data.");
    return;
  }

  const accessToken = process.env.META_CONVERSIONS_API_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    console.error(`[Meta CAPI] Purchase for order ${event.event_id} was not sent: META_CONVERSIONS_API_ACCESS_TOKEN is not configured.`);
    return;
  }

  const eventSourceUrl = sourceUrl ? normalizeEventSourceUrl(sourceUrl) : null;
  if (!eventSourceUrl) {
    console.error(`[Meta CAPI] Purchase for order ${event.event_id} was not sent: event source URL is unavailable or invalid.`);
    return;
  }

  const payload = {
    data: [
      {
        ...event,
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: eventSourceUrl,
        action_source: "website",
        user_data: { ph: [hashPhoneNumber(phone)] },
      },
    ],
  };
  const endpoint = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(accessToken)}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(META_CONVERSIONS_API_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`[Meta CAPI] Purchase for order ${event.event_id} failed with HTTP ${response.status}.`);
      return;
    }

    console.info(`[Meta CAPI] Purchase accepted for order ${event.event_id}.`);
  } catch (error) {
    console.error(`[Meta CAPI] Purchase dispatch failed for order ${event.event_id}.`, error);
  }
}
