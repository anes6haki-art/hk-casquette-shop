"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createOrder } from "@/lib/orders";
import { sendPurchaseToConversionsApi } from "@/lib/meta-conversions-api";
import type { NewOrder } from "@/lib/store-data";

export async function submitOrder(input: NewOrder) {
  const order = await createOrder(input);
  let eventSourceUrl: string | null = null;
  try {
    const requestHeaders = await headers();
    eventSourceUrl = requestHeaders.get("referer") ?? requestHeaders.get("origin");
  } catch (error) {
    console.error(`[Meta CAPI] Could not read request URL for saved order ${order.id}.`, error);
  }
  await sendPurchaseToConversionsApi(order, input.phone, eventSourceUrl);

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
  return order;
}
