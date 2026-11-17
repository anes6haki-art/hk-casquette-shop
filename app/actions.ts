"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { createOrder } from "@/lib/orders";
import { sendPurchaseToConversionsApi } from "@/lib/meta-conversions-api";
import { isValidPurchaseEventId } from "@/lib/meta-purchase";
import { normalizeAlgerianPhoneNumber } from "@/lib/order-phone";
import type { NewOrder } from "@/lib/store-data";

export async function submitOrder(
  input: NewOrder,
  purchaseEventId: string,
  confirmationToken?: string,
) {
  try {
    if (!isValidPurchaseEventId(purchaseEventId)) {
      throw new Error("Invalid Purchase event ID.");
    }

    const result = await createOrder(input, confirmationToken);
    if (result.status !== "created") return { ok: true as const, ...result };

    const order = result.order;
    if (!order || typeof order.id !== "string" || order.id.length === 0) {
      throw new Error("Order creation returned an invalid order ID.");
    }
    let eventSourceUrl: string | null = null;
    let fbp: string | undefined;
    let fbc: string | undefined;
    let clientIpAddress: string | undefined;
    let clientUserAgent: string | undefined;
    try {
      const requestHeaders = await headers();
      eventSourceUrl = requestHeaders.get("referer") ?? requestHeaders.get("origin");
      clientIpAddress = (
        requestHeaders.get("x-forwarded-for")?.split(",", 1)[0]
        ?? requestHeaders.get("x-real-ip")
        ?? requestHeaders.get("cf-connecting-ip")
      )?.trim() || undefined;
      clientUserAgent = requestHeaders.get("user-agent")?.trim() || undefined;

      const cookieStore = await cookies();
      fbp = cookieStore.get("_fbp")?.value;
      fbc = cookieStore.get("_fbc")?.value;
    } catch (error) {
      console.error(`[Meta CAPI] Could not read request context for saved order ${order.id}.`, error);
    }
    const normalizedPhone = normalizeAlgerianPhoneNumber(input.phone);
    if (normalizedPhone) {
      try {
        await sendPurchaseToConversionsApi(
          order,
          purchaseEventId,
          { name: input.name, phone: normalizedPhone },
          eventSourceUrl,
          { fbp, fbc, clientIpAddress, clientUserAgent },
        );
      } catch (error) {
        console.error(`[Meta CAPI] Purchase dispatch failed for saved order ${order.id}.`, error);
      }
    } else {
      console.error(`[Meta CAPI] Purchase for saved order ${order.id} was not sent: customer phone could not be normalized.`);
    }

    try {
      revalidatePath("/admin");
      revalidatePath("/admin/products");
      revalidatePath("/");
      for (const productId of new Set(input.items.map((item) => item.productId))) {
        revalidatePath(`/products/${productId}`);
      }
      revalidatePath("/products");
    } catch (error) {
      console.error(`[Order ${order.id}] Saved successfully, but cache revalidation failed.`, error);
    }
    return { ok: true as const, ...result, purchaseEventId };
  } catch (error) {
    console.error("DETAILED ORDER ERROR:", error);
    console.error(
      "DETAILED ORDER ERROR MESSAGE:",
      error instanceof Error ? error.message : String(error),
    );
    return {
      ok: false as const,
      status: "error" as const,
      message: process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "حدث خطأ في الخادم، يرجى المحاولة لاحقاً",
    };
  }
}
