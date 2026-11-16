"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createOrder } from "@/lib/orders";
import { sendPurchaseToConversionsApi } from "@/lib/meta-conversions-api";
import { normalizeAlgerianPhoneNumber } from "@/lib/order-phone";
import type { NewOrder } from "@/lib/store-data";

export async function submitOrder(input: NewOrder, confirmationToken?: string) {
  try {
    const result = await createOrder(input, confirmationToken);
    if (result.status !== "created") return { ok: true as const, ...result };

    const order = result.order;
    if (!order || typeof order.id !== "string" || order.id.length === 0) {
      throw new Error("Order creation returned an invalid order ID.");
    }
    let eventSourceUrl: string | null = null;
    try {
      const requestHeaders = await headers();
      eventSourceUrl = requestHeaders.get("referer") ?? requestHeaders.get("origin");
    } catch (error) {
      console.error(`[Meta CAPI] Could not read request URL for saved order ${order.id}.`, error);
    }
    const normalizedPhone = normalizeAlgerianPhoneNumber(input.phone);
    if (normalizedPhone) {
      try {
        await sendPurchaseToConversionsApi(order, normalizedPhone, eventSourceUrl);
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
    return { ok: true as const, ...result };
  } catch (error) {
    console.error("[Order] Failed to process order submission.", error);
    return {
      ok: false as const,
      status: "error" as const,
      message: "حدث خطأ في الخادم، يرجى المحاولة لاحقاً",
    };
  }
}
