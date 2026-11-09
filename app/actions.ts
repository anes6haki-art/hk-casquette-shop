"use server";

import { revalidatePath } from "next/cache";
import { createOrder } from "@/lib/orders";
import type { NewOrder } from "@/lib/store-data";

export async function submitOrder(input: NewOrder) {
  const order = await createOrder(input);
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
