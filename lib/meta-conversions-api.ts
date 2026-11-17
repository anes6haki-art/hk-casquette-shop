import "server-only";

import { createHash } from "node:crypto";
import {
  createPurchaseEvent,
  META_PIXEL_ID,
  normalizeMetaPhone,
  normalizeMetaText,
  splitCustomerName,
  type CustomerMetaData,
} from "./meta-purchase";

const META_GRAPH_API_VERSION = "v27.0";
const META_CONVERSIONS_API_TIMEOUT_MS = 8000;

function hashMetaValue(value: string) {
  return createHash("sha256").update(normalizeMetaText(value), "utf8").digest("hex");
}

function hashPhoneNumber(phone: string) {
  const normalizedPhone = normalizeMetaPhone(phone);
  return normalizedPhone ? hashMetaValue(normalizedPhone) : null;
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
  customer: CustomerMetaData,
  sourceUrl: string | null,
  requestData: {
    fbp?: string;
    fbc?: string;
    clientIpAddress?: string;
    clientUserAgent?: string;
  },
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

  const hashedPhone = hashPhoneNumber(customer.phone);
  const { firstName, lastName } = splitCustomerName(customer.name);
  const userData: {
    ph?: string[];
    fn?: string[];
    ln?: string[];
    country?: string[];
    fbp?: string;
    fbc?: string;
    client_ip_address?: string;
    client_user_agent?: string;
  } = {
    country: [hashMetaValue("dz")],
  };

  if (hashedPhone) userData.ph = [hashedPhone];
  if (firstName) userData.fn = [hashMetaValue(firstName)];
  if (lastName) userData.ln = [hashMetaValue(lastName)];
  if (requestData.fbp) userData.fbp = requestData.fbp;
  if (requestData.fbc) userData.fbc = requestData.fbc;
  if (requestData.clientIpAddress) userData.client_ip_address = requestData.clientIpAddress;
  if (requestData.clientUserAgent) userData.client_user_agent = requestData.clientUserAgent;

  const payload = {
    data: [
      {
        ...event,
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: eventSourceUrl,
        action_source: "website",
        user_data: userData,
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
