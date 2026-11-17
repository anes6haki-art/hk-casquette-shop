"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  createPurchaseEvent,
  META_PIXEL_ID,
  normalizeMetaPhone,
  normalizeMetaText,
  PURCHASE_CURRENCY,
  splitCustomerName,
  type CustomerMetaData,
} from "../lib/meta-purchase";

const PURCHASE_STORAGE_PREFIX = "meta-pixel-purchase-sent:";
const firedPurchases = new Set<string>();

declare global {
  interface Window {
    fbq?: (...args: [string, ...unknown[]]) => void;
    __fbPixelInitialized?: boolean;
    __metaPixelReady?: boolean;
    __metaPixelLoadFailed?: boolean;
  }
}

function logPixelError(message: string, error?: unknown) {
  console.error(`[Meta Pixel] ${message}`, error);
}

function getPurchaseStorageKey(orderId: string) {
  return `${PURCHASE_STORAGE_PREFIX}${encodeURIComponent(orderId)}`;
}

async function hashMetaValue(value: string) {
  const digest = await window.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalizeMetaText(value)),
  );
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function trackInitiateCheckout(value: number, productIds: string[]) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") {
    logPixelError("InitiateCheckout could not be dispatched because the Pixel is unavailable.");
    return;
  }
  if (!Number.isFinite(value) || productIds.length === 0) {
    logPixelError("Skipped InitiateCheckout with invalid checkout data.");
    return;
  }

  try {
    window.fbq("track", "InitiateCheckout", {
      value,
      currency: PURCHASE_CURRENCY,
      content_type: "product",
      content_ids: [...new Set(productIds)],
    });
  } catch (error) {
    logPixelError("InitiateCheckout dispatch failed.", error);
  }
}

export async function trackPurchase(
  order: { id: string; totalPrice: number },
  customer: CustomerMetaData,
  eventId: string,
) {
  const event = createPurchaseEvent(order, eventId);

  if (typeof window === "undefined") {
    logPixelError("Purchase tracking was called outside the browser.");
    return;
  }
  if (!event.event_id || !Number.isSafeInteger(event.value) || event.value <= 0) {
    logPixelError("Skipped a Purchase event with invalid order data.");
    return;
  }
  if (typeof window.fbq !== "function") {
    logPixelError(`Purchase for order ${event.event_id} could not be dispatched because the Pixel is unavailable.`);
    return;
  }

  const normalizedPhone = normalizeMetaPhone(customer.phone);
  const { firstName, lastName } = splitCustomerName(customer.name);
  const storageKey = getPurchaseStorageKey(order.id);
  if (firedPurchases.has(order.id)) return;
  try {
    if (window.localStorage.getItem(storageKey) === "sent") {
      firedPurchases.add(order.id);
      return;
    }
  } catch (error) {
    logPixelError(`Could not read Purchase deduplication state for order ${event.event_id}.`, error);
  }

  firedPurchases.add(order.id);
  const advancedMatching: { ph?: string; fn?: string; ln?: string } = {};
  try {
    const [phoneHash, firstNameHash, lastNameHash] = await Promise.all([
      normalizedPhone ? hashMetaValue(normalizedPhone) : Promise.resolve(undefined),
      firstName ? hashMetaValue(firstName) : Promise.resolve(undefined),
      lastName ? hashMetaValue(lastName) : Promise.resolve(undefined),
    ]);
    if (phoneHash) advancedMatching.ph = phoneHash;
    if (firstNameHash) advancedMatching.fn = firstNameHash;
    if (lastNameHash) advancedMatching.ln = lastNameHash;
  } catch (error) {
    logPixelError(`Purchase Advanced Matching could not be hashed for order ${event.event_id}.`, error);
  }

  try {
    if (Object.keys(advancedMatching).length > 0) {
      window.fbq("init", META_PIXEL_ID, advancedMatching);
    }
    window.fbq(
      "track",
      event.event_name,
      { value: event.value, currency: event.currency },
      { eventID: event.event_id },
    );
    try {
      window.localStorage.setItem(storageKey, "sent");
    } catch (error) {
      logPixelError(`Could not persist Purchase deduplication state for order ${event.event_id}.`, error);
    }
  } catch (error) {
    firedPurchases.delete(order.id);
    logPixelError(`Purchase dispatch failed for order ${event.event_id}.`, error);
  }
}

export default function MetaPixel() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) {
      return;
    }

    previousPathname.current = pathname;
    if (window.__metaPixelReady && typeof window.fbq === "function") {
      window.fbq("track", "PageView");
    }
  }, [pathname]);

  return null;
}
