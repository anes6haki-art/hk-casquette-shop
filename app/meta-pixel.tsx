"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  createPurchaseEvent,
  META_PIXEL_ID,
  normalizeMetaPhone,
  splitCustomerName,
  type CustomerMetaData,
} from "../lib/meta-purchase";

const PURCHASE_STORAGE_PREFIX = "meta-pixel-purchase-sent:";
const ORDER_CURRENCY = "DZD";
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
      currency: ORDER_CURRENCY,
      content_type: "product",
      content_ids: [...new Set(productIds)],
    });
  } catch (error) {
    logPixelError("InitiateCheckout dispatch failed.", error);
  }
}

export function trackPurchase(
  order: { id: string; totalPrice: number },
  customer: CustomerMetaData,
) {
  const event = createPurchaseEvent(order);

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
  try {
    const advancedMatching: { ph?: string[]; fn?: string[]; ln?: string[] } = {};
    if (normalizedPhone) advancedMatching.ph = [normalizedPhone];
    if (firstName) advancedMatching.fn = [firstName];
    if (lastName) advancedMatching.ln = [lastName];
    if (Object.keys(advancedMatching).length > 0) {
      window.fbq("init", META_PIXEL_ID, advancedMatching);
    }
  } catch (error) {
    logPixelError(`Purchase advanced matching could not be applied for order ${event.event_id}.`, error);
  }

  const storageKey = getPurchaseStorageKey(event.event_id);
  if (firedPurchases.has(event.event_id)) return;
  try {
    if (window.localStorage.getItem(storageKey) === "sent") {
      firedPurchases.add(event.event_id);
      return;
    }
  } catch (error) {
    logPixelError(`Could not read Purchase deduplication state for order ${event.event_id}.`, error);
  }

  firedPurchases.add(event.event_id);
  try {
    window.localStorage.setItem(storageKey, "sent");
  } catch (error) {
    logPixelError(`Could not persist Purchase deduplication state for order ${event.event_id}.`, error);
  }

  console.trace("Purchase Pixel Fired");
  try {
    window.fbq(
      "track",
      event.event_name,
      { value: event.value, currency: event.currency },
      { eventID: event.event_id },
    );
  } catch (error) {
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
