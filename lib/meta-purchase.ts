export const META_PIXEL_ID = "1775961124238403";
export const PURCHASE_CURRENCY = "DZD" as const;

export type CustomerMetaData = {
  name: string;
  phone: string;
};

export function normalizeMetaText(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function normalizeMetaPhone(value: string) {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";

  const nationalNumber = digits.startsWith("00213")
    ? `0${digits.slice(5)}`
    : digits.startsWith("213")
      ? `0${digits.slice(3)}`
      : digits.startsWith("0")
        ? digits
        : `0${digits}`;

  if (!/^0[5-7]\d{8}$/.test(nationalNumber)) return "";
  return `213${nationalNumber.slice(1)}`;
}

export function splitCustomerName(value: string) {
  const normalizedName = normalizeMetaText(value);
  const parts = normalizedName.split(" ").filter(Boolean);

  return {
    firstName: parts[0] ?? "",
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : "",
  };
}

export function createPurchaseEvent(order: { id: string; totalPrice: number }) {
  const rawValue = Number(order.totalPrice);
  const value = Number.isFinite(rawValue)
    ? Math.round((rawValue + Number.EPSILON) * 100) / 100
    : 0;

  return {
    event_name: "Purchase" as const,
    event_id: String(order.id).trim(),
    value,
    currency: PURCHASE_CURRENCY,
  };
}
