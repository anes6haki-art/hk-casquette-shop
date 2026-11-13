"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

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
      currency: "DZD",
      content_type: "product",
      content_ids: [...new Set(productIds)],
    });
  } catch (error) {
    logPixelError("InitiateCheckout dispatch failed.", error);
  }
}

export function trackPurchase(order: { id: string; price: number }) {
  const eventID = String(order.id);
  const value = order.price;

  if (typeof window === "undefined") {
    logPixelError("Purchase tracking was called outside the browser.");
    return;
  }
  if (!eventID || !Number.isFinite(value)) {
    logPixelError("Skipped a Purchase event with invalid order data.");
    return;
  }
  if (typeof window.fbq !== "function") {
    logPixelError(`Purchase for order ${eventID} could not be dispatched because the Pixel is unavailable.`);
    return;
  }

  const storageKey = getPurchaseStorageKey(eventID);
  if (firedPurchases.has(eventID)) return;
  try {
    if (window.localStorage.getItem(storageKey) === "sent") {
      firedPurchases.add(eventID);
      return;
    }
  } catch (error) {
    logPixelError(`Could not read Purchase deduplication state for order ${eventID}.`, error);
  }

  firedPurchases.add(eventID);
  try {
    window.localStorage.setItem(storageKey, "sent");
  } catch (error) {
    logPixelError(`Could not persist Purchase deduplication state for order ${eventID}.`, error);
  }

  console.trace("Purchase Pixel Fired");
  try {
    window.fbq(
      "track",
      "Purchase",
      {
        value,
        currency: "DZD",
      },
      { eventID },
    );
  } catch (error) {
    logPixelError(`Purchase dispatch failed for order ${eventID}.`, error);
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
