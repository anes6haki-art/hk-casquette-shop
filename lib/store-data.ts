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

export const WILAYA_LABELS_AR = [
  "أدرار", "الشلف", "الأغواط", "أم البواقي", "باتنة", "بجاية",
  "بسكرة", "بشار", "البليدة", "البويرة", "تمنراست", "تبسة",
  "تلمسان", "تيارت", "تيزي وزو", "الجزائر", "الجلفة", "جيجل",
  "سطيف", "سعيدة", "سكيكدة", "سيدي بلعباس", "عنابة", "قالمة",
  "قسنطينة", "المدية", "مستغانم", "المسيلة", "معسكر", "ورقلة",
  "وهران", "البيض", "إليزي", "برج بوعريريج", "بومرداس",
  "الطارف", "تندوف", "تيسمسيلت", "الوادي", "خنشلة", "سوق أهراس",
  "تيبازة", "ميلة", "عين الدفلى", "النعامة", "عين تموشنت", "غرداية",
  "غليزان", "تيميمون", "برج باجي مختار", "أولاد جلال",
  "بني عباس", "عين صالح", "عين قزام", "تقرت", "جانت",
  "المغير", "المنيعة",
] as const;

export function getWilayaLabelAr(wilaya: string) {
  const index = WILAYAS.indexOf(wilaya as (typeof WILAYAS)[number]);
  return index < 0 ? wilaya : WILAYA_LABELS_AR[index];
}

export const ORDER_SIZES = ["Standard", "S", "M", "L"] as const;
export const ORDER_SIZE_LABELS_AR: Record<(typeof ORDER_SIZES)[number], string> = {
  Standard: "قياسي",
  S: "صغير",
  M: "متوسط",
  L: "كبير",
};

const COLOR_LABELS_AR: Record<string, string> = {
  Noir: "أسود",
  Beige: "بيج",
  Olive: "زيتي",
  "Bleu Marine": "أزرق داكن",
  Bordeaux: "عنابي",
  Gris: "رمادي",
  Sable: "رملي",
  "Vert Forêt": "أخضر غابي",
  Terracotta: "طوبي",
  "Bleu Ciel": "أزرق سماوي",
  Standard: "قياسي",
};

const PRODUCT_TITLE_LABELS_AR: Record<string, string> = {
  "Casquette Classique Noire": "قبعة كلاسيكية سوداء",
  "Casquette Urban Beige": "قبعة حضرية بلون البيج",
  "Casquette Olive Street": "قبعة زيتية بطابع الشارع",
  "Casquette Bleu Marine": "قبعة زرقاء داكنة",
  "Casquette Bordeaux Classic": "قبعة كلاسيكية بلون خمري",
  "Casquette Gris Graphite": "قبعة رمادية فحمية",
  "Casquette Sable Weekend": "قبعة رملية لعطلة نهاية الأسبوع",
  "Casquette Vert Forêt": "قبعة خضراء بلون الغابة",
  "Casquette Terracotta": "قبعة بلون الطوب",
  "Casquette Bleu Ciel": "قبعة زرقاء سماوية",
};

const PRODUCT_DESCRIPTION_LABELS_AR: Record<string, string> = {
  "Une casquette noire intemporelle, facile à associer au quotidien. Visière courbée, finitions soignées et style décontracté.":
    "قبعة سوداء أنيقة وخالدة، سهلة التنسيق يومياً. بواقٍ منحني وتشطيب متقن وأسلوب مريح.",
  "Une teinte beige douce et polyvalente pour compléter vos tenues de tous les jours. Coupe confortable et allure urbaine.":
    "لون بيج هادئ ومتعدد الاستخدامات لإكمال إطلالاتكم اليومية، بقصة مريحة ومظهر عصري.",
  "Un coloris olive inspiré du plein air, avec une silhouette streetwear qui se porte en ville comme en escapade.":
    "لون زيتي مستوحى من الطبيعة بتصميم عصري يناسب المدينة والرحلات.",
  "Un bleu marine élégant et facile à porter. Une casquette casual pensée pour accompagner vos sorties toute l’année.":
    "لون أزرق داكن أنيق وسهل التنسيق. قبعة عملية ترافقكم في مختلف المناسبات طوال العام.",
  "Une touche bordeaux pour apporter de la couleur à votre look. Modèle classique avec visière arrondie.":
    "لمسة خمريّة تضيف لوناً إلى إطلالتكم. تصميم كلاسيكي بواقٍ مستدير.",
  "Un gris graphite sobre pour un style moderne et minimal. S’accorde facilement avec vos essentiels.":
    "لون رمادي فحمي هادئ لأسلوب عصري وبسيط، يسهل تنسيقه مع ملابسكم الأساسية.",
  "La couleur sable et la coupe décontractée en font un indispensable pour vos week-ends et promenades.":
    "لون رملي وقصة مريحة تجعلها خياراً مثالياً لعطلة نهاية الأسبوع والتنزه.",
  "Un vert profond au caractère affirmé. Modèle polyvalent pour les amateurs de tons naturels.":
    "لون أخضر عميق بطابع مميز. تصميم عملي لمحبي الألوان الطبيعية.",
  "Une nuance terracotta chaleureuse pour donner du relief à votre tenue, sans compromis sur le confort.":
    "درجة طوبية دافئة تضفي لمسة مميزة على إطلالتكم مع الحفاظ على الراحة.",
  "Une couleur bleu ciel lumineuse et un design décontracté pour compléter les journées ensoleillées.":
    "لون أزرق سماوي مشرق وتصميم مريح لإطلالات الأيام المشمسة.",
};

export function getColorLabelAr(color: string) {
  return COLOR_LABELS_AR[color] ?? color;
}

export function getProductTitleAr(title: string) {
  return PRODUCT_TITLE_LABELS_AR[title] ?? title;
}

export function getProductDescriptionAr(description: string) {
  return PRODUCT_DESCRIPTION_LABELS_AR[description] ?? description;
}

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
  HOME: "التوصيل إلى المنزل",
  DESK: "التوصيل إلى المكتب",
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
