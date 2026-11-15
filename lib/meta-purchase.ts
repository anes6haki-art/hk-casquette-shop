export const META_PIXEL_ID = "1775961124238403";
export const PURCHASE_CURRENCY = "DZD" as const;

export function createPurchaseEvent(order: { id: string; totalPrice: number }) {
  return {
    event_name: "Purchase" as const,
    event_id: String(order.id),
    value: order.totalPrice,
    currency: PURCHASE_CURRENCY,
  };
}
