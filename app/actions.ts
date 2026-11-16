"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createOrder } from "@/lib/orders";
import { sendPurchaseToConversionsApi } from "@/lib/meta-conversions-api";
import { normalizeAlgerianPhoneNumber } from "@/lib/order-phone";
import type { NewOrder } from "@/lib/store-data";

export async function submitOrder(input: NewOrder, confirmationToken?: string) {
  const result = await createOrder(input, confirmationToken);
  if (result.status !== "created") return result;

  const order = result.order;
  let eventSourceUrl: string | null = null;
  try {
    const requestHeaders = await headers();
    eventSourceUrl = requestHeaders.get("referer") ?? requestHeaders.get("origin");
  } catch (error) {
    console.error(`[Meta CAPI] Could not read request URL for saved order ${order.id}.`, error);
  }
  const normalizedPhone = normalizeAlgerianPhoneNumber(input.phone);
  if (normalizedPhone) {
    await sendPurchaseToConversionsApi(order, normalizedPhone, eventSourceUrl);
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
  return result;
}
