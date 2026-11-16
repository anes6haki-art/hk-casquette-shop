import { normalizeAlgerianPhoneNumber } from "./order-phone";

export const DUPLICATE_COUNTED_ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
] as const;

export type RecentOrderForDuplicateCheck = {
  phone?: string | null;
  items?: ({ productId?: string | null } | null)[] | null;
};

export function getProductSignature(productIds: string[]) {
  return JSON.stringify([...new Set(productIds)].sort());
}

export function countMatchingRecentOrders(
  orders: (RecentOrderForDuplicateCheck | null | undefined)[],
  normalizedPhone: string,
  productSignature: string,
) {
  return orders.filter((order) => {
    if (
      !order
      || typeof order.phone !== "string"
      || normalizeAlgerianPhoneNumber(order.phone) !== normalizedPhone
      || !Array.isArray(order.items)
      || order.items.length === 0
      || order.items.some((item) =>
        !item || typeof item.productId !== "string" || item.productId.length === 0,
      )
    ) {
      return false;
    }

    const signature = getProductSignature(
      order.items.flatMap((item) =>
        typeof item?.productId === "string" && item.productId.length > 0
          ? [item.productId]
          : [],
      ),
    );
    return signature === productSignature;
  }).length;
}
