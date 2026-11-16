import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { getAdminSessionSecret, hasAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  countMatchingRecentOrders,
  DUPLICATE_COUNTED_ORDER_STATUSES,
  getProductSignature,
} from "@/lib/order-duplicate";
import { normalizeAlgerianPhoneNumber } from "@/lib/order-phone";
import { getStorefrontProduct } from "@/lib/products";
import {
  isOrderStatus,
  isDeliveryType,
  isCommuneForWilaya,
  getOfferPackPrice,
  SHIPPING_FEE,
  WILAYAS,
  type NewOrder,
  type ShippingRateDto,
} from "@/lib/store-data";

const DUPLICATE_ORDER_WINDOW_MS = 24 * 60 * 60 * 1000;
const DUPLICATE_CONFIRMATION_TOKEN_TTL_MS = 5 * 60 * 1000;

type DuplicateConfirmationPayload = {
  phone: string;
  productSignature: string;
  expiresAt: number;
};

function getDuplicateConfirmationSecret() {
  return getAdminSessionSecret();
}

function signDuplicateConfirmationPayload(encodedPayload: string) {
  return createHmac("sha256", getDuplicateConfirmationSecret())
    .update(`duplicate-order-confirmation:v1:${encodedPayload}`)
    .digest("base64url");
}

function createDuplicateConfirmationToken(phone: string, productSignature: string) {
  const payload: DuplicateConfirmationPayload = {
    phone,
    productSignature,
    expiresAt: Date.now() + DUPLICATE_CONFIRMATION_TOKEN_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${signDuplicateConfirmationPayload(encodedPayload)}`;
}

function isValidDuplicateConfirmationToken(
  token: string | undefined,
  phone: string,
  productSignature: string,
) {
  if (!token || token.length > 2048) return false;
  const [encodedPayload, signature, ...extra] = token.split(".");
  if (!encodedPayload || !signature || extra.length) return false;

  const expectedSignature = signDuplicateConfirmationPayload(encodedPayload);
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expectedSignature);
  if (
    actualBytes.length !== expectedBytes.length
    || !timingSafeEqual(actualBytes, expectedBytes)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as DuplicateConfirmationPayload;
    return payload.phone === phone
      && payload.productSignature === productSignature
      && Number.isSafeInteger(payload.expiresAt)
      && payload.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export async function createOrder(input: NewOrder, confirmationToken?: string) {
  if (
    !input ||
    (input.productId !== undefined && typeof input.productId !== "string") ||
    (input.offerPack !== undefined && typeof input.offerPack !== "boolean") ||
    typeof input.name !== "string" ||
    typeof input.phone !== "string" ||
    typeof input.wilaya !== "string" ||
    typeof input.commune !== "string" ||
    (input.notes !== undefined && typeof input.notes !== "string") ||
    typeof input.deliveryType !== "string" ||
    !Array.isArray(input.items) ||
    input.items.length < 1 ||
    input.items.length > 20
  ) {
    throw new Error("بيانات الطلب غير صالحة.");
  }

  const name = input.name.trim();
  const normalizedPhone = normalizeAlgerianPhoneNumber(input.phone);
  const commune = input.commune.trim();
  const notes = input.notes?.trim() ?? "";

  if (name.length < 3 || name.length > 120) {
    throw new Error("يرجى إدخال الاسم الكامل بشكل صحيح.");
  }
  if (notes.length > 1000) {
    throw new Error("يجب ألا تتجاوز الملاحظات 1000 حرفاً.");
  }
  if (!normalizedPhone) {
    throw new Error("يرجى إدخال رقم هاتف جزائري صالح.");
  }
  if (!(WILAYAS as readonly string[]).includes(input.wilaya)) {
    throw new Error("يرجى اختيار ولاية صالحة.");
  }
  if (!isDeliveryType(input.deliveryType)) {
    throw new Error("يرجى اختيار طريقة توصيل صالحة.");
  }
  if (!isCommuneForWilaya(input.wilaya, commune)) {
    throw new Error("يرجى اختيار بلدية تابعة لهذه الولاية.");
  }
  let totalQuantity = 0;
  const requestedItems = input.items.map((item) => {
    if (
      !item ||
      typeof item.productId !== "string" ||
      typeof item.color !== "string" ||
      typeof item.size !== "string" ||
      typeof item.quantity !== "number" ||
      (item.variantId !== undefined && typeof item.variantId !== "string")
    ) {
      throw new Error("أحد عناصر الطلب غير صالح.");
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) {
      throw new Error("الكمية المطلوبة غير صالحة.");
    }
    if (!["Standard", "S", "M", "L"].includes(item.size)) {
      throw new Error("يرجى اختيار مقاس صالح.");
    }
    totalQuantity += item.quantity;
    return item;
  });
  if (totalQuantity > 10) {
    throw new Error("لا يمكن أن يتجاوز إجمالي الطلب 10 قبعات.");
  }

  const uniqueProductIds = [...new Set(requestedItems.map((item) => item.productId))];
  const products = await Promise.all(uniqueProductIds.map((productId) => getStorefrontProduct(productId)));
  const productById = new Map(products.filter((product) => product !== null).map((product) => [product.id, product]));
  if (productById.size !== uniqueProductIds.length) {
    throw new Error("أحد المنتجات لم يعد متاحاً.");
  }

  const quantityByProduct = new Map<string, number>();
  const quantityByVariant = new Map<string, number>();
  const orderItems = requestedItems.map((item) => {
    const product = productById.get(item.productId);
    if (!product) throw new Error("أحد المنتجات لم يعد متاحاً.");

    quantityByProduct.set(item.productId, (quantityByProduct.get(item.productId) ?? 0) + item.quantity);

    if (product.variants.length === 0) {
      if (item.variantId || item.color !== "Standard") {
        throw new Error("اللون المحدد لم يعد متاحاً.");
      }
      return {
        productId: product.id,
        title: product.title,
        color: "Standard",
        size: item.size,
        quantity: item.quantity,
        unitPrice: product.discountedPrice,
      };
    }

    const variant = product.variants.find((candidate) => candidate.id === item.variantId);
    if (!variant || item.color !== variant.colorName || item.size !== variant.size) {
      throw new Error("اللون أو المقاس المحدد لم يعد متاحاً.");
    }
    if (variant.stock < item.quantity) {
      throw new Error("المقاس المحدد نفد من المخزون.");
    }
    quantityByVariant.set(variant.id, (quantityByVariant.get(variant.id) ?? 0) + item.quantity);
    return {
      productId: product.id,
      title: product.title,
      color: variant.colorName,
      size: item.size,
      quantity: item.quantity,
      unitPrice: product.discountedPrice,
    };
  });
  for (const [productId, quantity] of quantityByProduct) {
    const product = productById.get(productId);
    if (!product || quantity > product.stockQuantity) {
      throw new Error("الكمية المطلوبة غير متوفرة في المخزون.");
    }
  }
  let subtotal = orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const isOfferPack = input.offerPack === true;
  if (isOfferPack && (
    uniqueProductIds.length !== 1
    || orderItems.length < 1
    || orderItems.length > 3
    || orderItems.length !== totalQuantity
  )) {
    throw new Error("الباقة المحددة غير صالحة.");
  }
  if (isOfferPack) {
    subtotal = getOfferPackPrice(orderItems[0].unitPrice, totalQuantity);
    const baseItemPrice = Math.floor(subtotal / orderItems.length);
    let remainingPrice = subtotal % orderItems.length;
    for (const item of orderItems) {
      item.unitPrice = baseItemPrice + (remainingPrice > 0 ? 1 : 0);
      remainingPrice -= remainingPrice > 0 ? 1 : 0;
    }
  }
  const orderProductTitle = [...new Set(orderItems.map((item) => item.title))].join(", ").slice(0, 500);
  const unitPrice = orderItems[0].unitPrice;
  const productIds = orderItems.map((item) => item.productId);
  const productSignature = getProductSignature(productIds);
  const confirmationIsValid = isValidDuplicateConfirmationToken(
    confirmationToken,
    normalizedPhone,
    productSignature,
  );

  await ensureShippingRates();
  const shippingRate = await prisma.shippingRate.findUnique({
    where: { wilaya: input.wilaya },
    select: { homePrice: true, deskPrice: true },
  });
  if (!shippingRate) {
    throw new Error("رسوم التوصيل غير مضبوطة لهذه الولاية.");
  }
  const shippingFee = input.deliveryType === "HOME"
    ? shippingRate.homePrice
    : shippingRate.deskPrice;

  return prisma.$transaction(async (transaction) => {
    const lockKey = `${normalizedPhone}:${productSignature}`;
    await transaction.$queryRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))
    `;

    const recentOrders = await transaction.order.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - DUPLICATE_ORDER_WINDOW_MS) },
        status: { in: [...DUPLICATE_COUNTED_ORDER_STATUSES] },
        items: { some: { productId: { in: productIds } } },
      },
      select: {
        phone: true,
        items: { select: { productId: true } },
      },
    });
    const matchingOrderCount = countMatchingRecentOrders(
      recentOrders,
      normalizedPhone,
      productSignature,
    );

    if (matchingOrderCount >= 2) {
      return { status: "limit_reached" as const };
    }
    if (matchingOrderCount === 1 && !confirmationIsValid) {
      return {
        status: "confirm_second" as const,
        confirmationToken: createDuplicateConfirmationToken(normalizedPhone, productSignature),
      };
    }

    for (const [productId, quantity] of quantityByProduct) {
      const stockUpdate = await transaction.product.updateMany({
        where: {
          id: productId,
          isActive: true,
          stockQuantity: { gte: quantity },
        },
        data: { stockQuantity: { decrement: quantity } },
      });
      if (stockUpdate.count !== 1) {
        throw new Error("تغير المخزون للتو. حدّثوا الصفحة قبل تأكيد الطلب.");
      }
    }
    for (const [variantId, quantity] of quantityByVariant) {
      const stockUpdate = await transaction.productVariant.updateMany({
        where: { id: variantId, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      });
      if (stockUpdate.count !== 1) {
        throw new Error("تغير مخزون اللون أو المقاس للتو. حدّثوا الصفحة قبل تأكيد الطلب.");
      }
    }

    const order = await transaction.order.create({
      data: {
        name,
        phone: `+213${normalizedPhone.slice(1)}`,
        productTitle: orderProductTitle,
        wilaya: input.wilaya,
        commune,
        notes: notes || null,
        quantity: totalQuantity,
        unitPrice,
        shippingFee,
        deliveryType: input.deliveryType,
        totalPrice: subtotal + shippingFee,
        items: { create: orderItems },
      },
      select: {
        id: true,
        shippingFee: true,
        unitPrice: true,
        totalPrice: true,
        items: { select: { productId: true } },
      },
    });
    return { status: "created" as const, order };
  });
}

export async function getOrdersForAdmin() {
  if (!(await hasAdminSession())) {
    throw new Error("غير مصرح بالوصول إلى الطلبات.");
  }

  return prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      productTitle: true,
      name: true,
      phone: true,
      wilaya: true,
      commune: true,
      notes: true,
      deliveryType: true,
      quantity: true,
      totalPrice: true,
      createdAt: true,
      status: true,
      trackingNumber: true,
      deliveryStatus: true,
      items: {
        select: {
          id: true,
          title: true,
          color: true,
          size: true,
          quantity: true,
          unitPrice: true,
        },
      },
    },
  });
}

export async function ensureShippingRates() {
  await prisma.shippingRate.createMany({
    data: WILAYAS.map((wilaya) => ({
      wilaya,
      homePrice: SHIPPING_FEE,
      deskPrice: Math.round(SHIPPING_FEE / 2),
    })),
    skipDuplicates: true,
  });
}

export async function getShippingRatesForCheckout(): Promise<ShippingRateDto[]> {
  await ensureShippingRates();
  return prisma.shippingRate.findMany({
    orderBy: { wilaya: "asc" },
    select: { wilaya: true, homePrice: true, deskPrice: true },
  });
}

export async function getShippingRatesForAdmin(): Promise<ShippingRateDto[]> {
  if (!(await hasAdminSession())) {
    throw new Error("غير مصرح بالوصول إلى أسعار التوصيل.");
  }
  await ensureShippingRates();
  return prisma.shippingRate.findMany({
    orderBy: { wilaya: "asc" },
    select: { wilaya: true, homePrice: true, deskPrice: true },
  });
}

export async function updateShippingRate(
  wilaya: string,
  homePrice: number,
  deskPrice: number,
) {
  if (!(await hasAdminSession())) {
    throw new Error("غير مصرح بتعديل أسعار التوصيل.");
  }
  if (!(WILAYAS as readonly string[]).includes(wilaya)) {
    throw new Error("الولاية غير صالحة.");
  }
  for (const price of [homePrice, deskPrice]) {
    if (!Number.isSafeInteger(price) || price < 0 || price > 100_000) {
      throw new Error("يجب أن تتراوح رسوم التوصيل بين 0 و100,000 دج.");
    }
  }

  return prisma.shippingRate.update({
    where: { wilaya },
    data: { homePrice, deskPrice },
    select: { wilaya: true },
  });
}

export async function deleteOrder(orderId: string) {
  if (!(await hasAdminSession())) {
    throw new Error("غير مصرح بحذف الطلب.");
  }
  if (!orderId || orderId.length > 100) {
    throw new Error("معرّف الطلب غير صالح.");
  }

  const existingOrder = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  if (!existingOrder) {
    throw new Error("لم يتم العثور على الطلب.");
  }

  return prisma.order.delete({
    where: { id: existingOrder.id },
    select: { id: true },
  });
}

export async function updateOrderStatus(orderId: string, status: string) {
  if (!(await hasAdminSession())) {
    throw new Error("غير مصرح بتعديل الطلب.");
  }
  if (!orderId || orderId.length > 100) {
    throw new Error("معرّف الطلب غير صالح.");
  }
  if (!isOrderStatus(status)) {
    throw new Error("حالة الطلب غير صالحة.");
  }

  const existingOrder = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  if (!existingOrder) {
    throw new Error("لم يتم العثور على الطلب.");
  }

  return prisma.order.update({
    where: { id: existingOrder.id },
    data: { status },
    select: { id: true },
  });
}
