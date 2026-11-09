"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type PurchaseEvent = {
  orderId: string;
  value: number;
};

type StoredPurchase = PurchaseEvent & {
  attempts: number;
  nextAttemptAt: number;
};

const PURCHASE_STORAGE_PREFIX = "meta-pixel-purchase:";
const PURCHASE_LOCK_PREFIX = "meta-pixel-purchase-lock:";
const MAX_PURCHASE_ATTEMPTS = 4;
const INITIAL_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 8_000;
const LOCK_LEASE_MS = 15_000;
const inMemoryPurchases = new Map<string, StoredPurchase>();
const activeLocks = new Set<string>();
const retryTimers = new Map<string, number>();

declare global {
  interface Window {
    fbq?: (...args: [string, ...unknown[]]) => void;
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

function readPurchase(orderId: string): StoredPurchase | null {
  try {
    const stored = window.localStorage.getItem(getPurchaseStorageKey(orderId));
    if (stored) {
      const purchase = JSON.parse(stored) as StoredPurchase;
      if (
        purchase.orderId === orderId
        && Number.isFinite(purchase.value)
        && Number.isInteger(purchase.attempts)
        && purchase.attempts >= 0
        && Number.isFinite(purchase.nextAttemptAt)
      ) {
        inMemoryPurchases.set(orderId, purchase);
        return purchase;
      }

      logPixelError(`Ignoring invalid stored Purchase state for order ${orderId}.`);
    }
  } catch (error) {
    logPixelError(`Could not read Purchase state for order ${orderId}.`, error);
  }

  return inMemoryPurchases.get(orderId) ?? null;
}

function writePurchase(purchase: StoredPurchase) {
  inMemoryPurchases.set(purchase.orderId, purchase);
  try {
    window.localStorage.setItem(
      getPurchaseStorageKey(purchase.orderId),
      JSON.stringify(purchase),
    );
  } catch (error) {
    logPixelError(`Could not persist Purchase state for order ${purchase.orderId}.`, error);
  }
}

function retryDelay(attempt: number) {
  return Math.min(
    INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1),
    MAX_RETRY_DELAY_MS,
  );
}

function schedulePurchaseAttempt(orderId: string, at: number) {
  const previousTimer = retryTimers.get(orderId);
  if (previousTimer !== undefined) {
    window.clearTimeout(previousTimer);
  }

  const timer = window.setTimeout(() => {
    retryTimers.delete(orderId);
    void processPurchase(orderId);
  }, Math.max(0, at - Date.now()));
  retryTimers.set(orderId, timer);
}

function withFallbackLock(orderId: string, callback: () => void) {
  if (activeLocks.has(orderId)) return;
  activeLocks.add(orderId);

  const leaseKey = `${PURCHASE_LOCK_PREFIX}${encodeURIComponent(orderId)}`;
  const token = `${Date.now()}-${Math.random()}`;
  let ownsLease = false;

  try {
    const lease = window.localStorage.getItem(leaseKey);
    if (lease) {
      const parsedLease = JSON.parse(lease) as { expiresAt?: number };
      if (typeof parsedLease.expiresAt === "number" && parsedLease.expiresAt > Date.now()) {
        activeLocks.delete(orderId);
        return;
      }
    }

    window.localStorage.setItem(
      leaseKey,
      JSON.stringify({ token, expiresAt: Date.now() + LOCK_LEASE_MS }),
    );
    const writtenLease = window.localStorage.getItem(leaseKey);
    ownsLease = writtenLease !== null
      && (JSON.parse(writtenLease) as { token?: string }).token === token;
  } catch (error) {
    logPixelError(`Cross-tab storage lock unavailable for order ${orderId}.`, error);
    ownsLease = true;
  }

  if (!ownsLease) return;

  try {
    callback();
  } finally {
    try {
      const lease = window.localStorage.getItem(leaseKey);
      if (lease && (JSON.parse(lease) as { token?: string }).token === token) {
        window.localStorage.removeItem(leaseKey);
      }
    } catch (error) {
      logPixelError(`Could not release the storage lock for order ${orderId}.`, error);
    }
    activeLocks.delete(orderId);
  }
}

async function withPurchaseLock(orderId: string, callback: () => void) {
  if (typeof navigator !== "undefined" && navigator.locks) {
    try {
      await navigator.locks.request(
        `${PURCHASE_LOCK_PREFIX}${orderId}`,
        { ifAvailable: true },
        (lock) => {
          if (lock) callback();
        },
      );
      return;
    } catch (error) {
      logPixelError(`Web Lock unavailable for order ${orderId}; using storage lock.`, error);
    }
  }

  withFallbackLock(orderId, callback);
}

async function processPurchase(orderId: string) {
  if (!window.__metaPixelReady || typeof window.fbq !== "function") return;

  await withPurchaseLock(orderId, () => {
    const purchase = readPurchase(orderId);
    if (!purchase) return;

    if (purchase.attempts >= MAX_PURCHASE_ATTEMPTS) {
      return;
    }
    if (purchase.nextAttemptAt > Date.now()) {
      schedulePurchaseAttempt(orderId, purchase.nextAttemptAt);
      return;
    }

    const attempt = purchase.attempts + 1;
    const nextPurchase: StoredPurchase = {
      ...purchase,
      attempts: attempt,
      nextAttemptAt: attempt < MAX_PURCHASE_ATTEMPTS
        ? Date.now() + retryDelay(attempt)
        : 0,
    };

    // Persist the attempt before dispatch so another tab will not immediately repeat it.
    writePurchase(nextPurchase);
    try {
      window.fbq?.(
        "track",
        "Purchase",
        { currency: "DZD", value: purchase.value },
        { eventID: purchase.orderId },
      );
    } catch (error) {
      logPixelError(
        `Purchase dispatch attempt ${attempt}/${MAX_PURCHASE_ATTEMPTS} failed for order ${orderId}.`,
        error,
      );
    }

    if (attempt < MAX_PURCHASE_ATTEMPTS) {
      schedulePurchaseAttempt(orderId, nextPurchase.nextAttemptAt);
    } else {
      logPixelError(
        `Purchase for order ${orderId} remains unconfirmed after ${MAX_PURCHASE_ATTEMPTS} attempts.`,
      );
    }
  });
}

function listStoredPurchaseIds() {
  const orderIds = new Set(inMemoryPurchases.keys());
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(PURCHASE_STORAGE_PREFIX)) {
        orderIds.add(decodeURIComponent(key.slice(PURCHASE_STORAGE_PREFIX.length)));
      }
    }
  } catch (error) {
    logPixelError("Could not scan stored Purchase events.", error);
  }
  return [...orderIds];
}

function processPendingPurchases() {
  for (const orderId of listStoredPurchaseIds()) {
    const purchase = readPurchase(orderId);
    if (!purchase || purchase.attempts >= MAX_PURCHASE_ATTEMPTS) continue;

    if (purchase.nextAttemptAt > Date.now()) {
      schedulePurchaseAttempt(orderId, purchase.nextAttemptAt);
    } else {
      schedulePurchaseAttempt(orderId, Date.now());
    }
  }
}

export function trackPurchase(orderId: string, value: number) {
  if (typeof window === "undefined") {
    logPixelError("Purchase tracking was called outside the browser.");
    return;
  }
  if (!orderId || !Number.isFinite(value)) {
    logPixelError("Skipped a Purchase event with invalid order data.");
    return;
  }

  if (!readPurchase(orderId)) {
    writePurchase({
      orderId,
      value,
      attempts: 0,
      nextAttemptAt: Date.now(),
    });
  }

  schedulePurchaseAttempt(orderId, Date.now());
}

export default function MetaPixel() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    const handlePixelReady = () => processPendingPurchases();
    const handlePixelLoadFailure = () => {
      logPixelError("The external Pixel script failed to load; Purchase events remain queued.");
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key?.startsWith(PURCHASE_STORAGE_PREFIX)) {
        processPendingPurchases();
      }
    };

    window.addEventListener("meta-pixel-ready", handlePixelReady);
    window.addEventListener("meta-pixel-load-failed", handlePixelLoadFailure);
    window.addEventListener("storage", handleStorage);

    if (window.__metaPixelReady) {
      processPendingPurchases();
    }

    return () => {
      window.removeEventListener("meta-pixel-ready", handlePixelReady);
      window.removeEventListener("meta-pixel-load-failed", handlePixelLoadFailure);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

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
