import communesByWilaya from "./communes-by-wilaya.json";

export const SHIPPING_FEE = 600;

export const WILAYAS = [
  "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna", "Béjaïa",
  "Biskra", "Béchar", "Blida", "Bouira", "Tamanrasset", "Tébessa",
  "Tlemcen", "Tiaret", "Tizi Ouzou", "Alger", "Djelfa", "Jijel",
  "Sétif", "Saïda", "Skikda", "Sidi Bel Abbès", "Annaba", "Guelma",
  "Constantine", "Médéa", "Mostaganem", "M’Sila", "Mascara", "Ouargla",
  "Oran", "El Bayadh", "Illizi", "Bordj Bou Arréridj", "Boumerdès",
  "El Tarf", "Tindouf", "Tissemsilt", "El Oued", "Khenchela", "Souk Ahras",
  "Tipaza", "Mila", "Aïn Defla", "Naâma", "Aïn Témouchent", "Ghardaïa",
  "Relizane", "Timimoun", "Bordj Badji Mokhtar", "Ouled Djellal",
  "Béni Abbès", "In Salah", "In Guezzam", "Touggourt", "Djanet",
  "El M’Ghair", "El Meniaa",
] as const;

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export const DELIVERY_TYPES = ["HOME", "DESK"] as const;
export type DeliveryType = (typeof DELIVERY_TYPES)[number];

export const DELIVERY_LABELS: Record<DeliveryType, string> = {
  HOME: "À domicile",
  DESK: "Stop Desk / Bureau",
};

// Source data: djazair.dev wilayas (CC0), grouped by the 58-Wilaya codes.
export const COMMUNES_BY_WILAYA: Record<string, readonly string[]> = communesByWilaya;
export const COMMUNES_BY_WILAYA_CODE: Record<string, readonly string[]> = Object.fromEntries(
  WILAYAS.map((wilaya, index) => [String(index + 1), COMMUNES_BY_WILAYA[wilaya] ?? []]),
);

export function isCommuneForWilaya(wilaya: string, commune: string) {
  return COMMUNES_BY_WILAYA[wilaya]?.includes(commune) ?? false;
}

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type NewOrder = {
  productId?: string;
  name: string;
  phone: string;
  wilaya: string;
  commune: string;
  items: NewOrderItem[];
  deliveryType: DeliveryType;
};

export type NewOrderItem = {
  productId: string;
  variantId?: string;
  color: string;
  size: string;
  quantity: number;
};

export type ProductDto = {
  id: string;
  title: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  stockQuantity: number;
  imageUrls: string[];
  variants: ProductVariantDto[];
  isActive: boolean;
  updatedAt: Date;
};

export type ProductVariantDto = {
  id: string;
  colorName: string;
  colorHex: string;
  images: string[];
};

export type ShippingRateDto = {
  wilaya: string;
  homePrice: number;
  deskPrice: number;
};

export function isOrderStatus(status: string): status is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(status);
}

export function isDeliveryType(deliveryType: string): deliveryType is DeliveryType {
  return (DELIVERY_TYPES as readonly string[]).includes(deliveryType);
}
