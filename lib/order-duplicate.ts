import { normalizeAlgerianPhoneNumber } from "./order-phone";

export const DUPLICATE_COUNTED_ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
] as const;

export type RecentOrderForDuplicateCheck = {
  phone: string;
  items: { productId: string | null }[];
};

export function getProductSignature(productIds: string[]) {
  return JSON.stringify([...new Set(productIds)].sort());
}

export function countMatchingRecentOrders(
  orders: RecentOrderForDuplicateCheck[],
  normalizedPhone: string,
  productSignature: string,
) {
  return orders.filter((order) => {
    if (normalizeAlgerianPhoneNumber(order.phone) !== normalizedPhone) return false;
    const signature = getProductSignature(
      order.items.flatMap((item) => item.productId ? [item.productId] : []),
    );
    return signature === productSignature;
  }).length;
}
