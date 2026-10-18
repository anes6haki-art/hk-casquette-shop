import "server-only";

import { hasAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getStorefrontProduct } from "@/lib/products";
import {
  isOrderStatus,
  isDeliveryType,
  isCommuneForWilaya,
  SHIPPING_FEE,
  WILAYAS,
  type NewOrder,
  type ShippingRateDto,
} from "@/lib/store-data";

export async function createOrder(input: NewOrder) {
  if (
    !input ||
    (input.productId !== undefined && typeof input.productId !== "string") ||
    typeof input.name !== "string" ||
    typeof input.phone !== "string" ||
    typeof input.wilaya !== "string" ||
    typeof input.commune !== "string" ||
    typeof input.deliveryType !== "string" ||
    !Array.isArray(input.items) ||
    input.items.length < 1 ||
    input.items.length > 20
  ) {
    throw new Error("Invalid order details.");
  }

  const name = input.name.trim();
  let phone = input.phone.replace(/\D/g, "");
  if (phone.startsWith("213") && phone.length === 12) {
    phone = phone.slice(3);
  } else if (phone.startsWith("0")) {
    phone = phone.slice(1);
  }
  const commune = input.commune.trim();

  if (name.length < 3 || name.length > 120) {
    throw new Error("Please enter a valid full name.");
  }
  if (!/^[5-7]\d{8}$/.test(phone)) {
    throw new Error("Please enter a valid Algerian mobile number.");
  }
  if (!(WILAYAS as readonly string[]).includes(input.wilaya)) {
    throw new Error("Please select a valid wilaya.");
  }
  if (!isDeliveryType(input.deliveryType)) {
    throw new Error("Please choose a valid delivery type.");
  }
  if (!isCommuneForWilaya(input.wilaya, commune)) {
    throw new Error("Please select a valid commune for this wilaya.");
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
      throw new Error("Un article de la commande est invalide.");
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) {
      throw new Error("La quantité demandée n’est pas valide.");
    }
    if (!["Standard", "S", "M", "L"].includes(item.size)) {
      throw new Error("Veuillez sélectionner une taille valide.");
    }
    totalQuantity += item.quantity;
    return item;
  });
  if (totalQuantity > 10) {
    throw new Error("Le total de la commande ne peut pas dépasser 10 casquettes.");
  }

  const uniqueProductIds = [...new Set(requestedItems.map((item) => item.productId))];
  const products = await Promise.all(uniqueProductIds.map((productId) => getStorefrontProduct(productId)));
  const productById = new Map(products.filter((product) => product !== null).map((product) => [product.id, product]));
  if (productById.size !== uniqueProductIds.length) {
    throw new Error("Un produit de votre panier n’est plus disponible.");
  }

  const quantityByProduct = new Map<string, number>();
  const orderItems = requestedItems.map((item) => {
    const product = productById.get(item.productId);
    if (!product) throw new Error("Un produit de votre panier n’est plus disponible.");

    quantityByProduct.set(item.productId, (quantityByProduct.get(item.productId) ?? 0) + item.quantity);

    if (product.variants.length === 0) {
      if (item.variantId || item.color !== "Standard") {
        throw new Error("La couleur sélectionnée n’est plus disponible.");
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
    if (!variant || item.color !== variant.colorName) {
      throw new Error("La couleur sélectionnée n’est plus disponible.");
    }
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
      throw new Error("La quantité demandée n’est pas disponible en stock.");
    }
  }
  const subtotal = orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const orderProductTitle = [...new Set(orderItems.map((item) => item.title))].join(", ").slice(0, 500);
  const unitPrice = orderItems[0].unitPrice;

  await ensureShippingRates();
  const shippingRate = await prisma.shippingRate.findUnique({
    where: { wilaya: input.wilaya },
    select: { homePrice: true, deskPrice: true },
  });
  if (!shippingRate) {
    throw new Error("Shipping prices are not configured for this wilaya.");
  }
  const shippingFee = input.deliveryType === "HOME"
    ? shippingRate.homePrice
    : shippingRate.deskPrice;

  return prisma.$transaction(async (transaction) => {
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
        throw new Error("Le stock vient de changer. Actualisez la page avant de commander.");
      }
    }

    return transaction.order.create({
      data: {
        name,
        phone: `+213${phone}`,
        productTitle: orderProductTitle,
        wilaya: input.wilaya,
        commune,
        quantity: totalQuantity,
        unitPrice,
        shippingFee,
        deliveryType: input.deliveryType,
        totalPrice: subtotal + shippingFee,
        items: { create: orderItems },
      },
      select: { id: true, shippingFee: true, unitPrice: true, totalPrice: true },
    });
  });
}

export async function getOrdersForAdmin() {
  if (!(await hasAdminSession())) {
    throw new Error("Unauthorized order access.");
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
    throw new Error("Unauthorized shipping price access.");
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
    throw new Error("Unauthorized shipping price update.");
  }
  if (!(WILAYAS as readonly string[]).includes(wilaya)) {
    throw new Error("Invalid wilaya.");
  }
  for (const price of [homePrice, deskPrice]) {
    if (!Number.isSafeInteger(price) || price < 0 || price > 100_000) {
      throw new Error("Shipping prices must be between 0 and 100,000 DA.");
    }
  }

  return prisma.shippingRate.update({
    where: { wilaya },
    data: { homePrice, deskPrice },
    select: { wilaya: true },
  });
}

export async function updateOrderStatus(orderId: string, status: string) {
  if (!(await hasAdminSession())) {
    throw new Error("Unauthorized order update.");
  }
  if (!orderId || orderId.length > 100) {
    throw new Error("Invalid order ID.");
  }
  if (!isOrderStatus(status)) {
    throw new Error("Invalid order status.");
  }

  const existingOrder = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  if (!existingOrder) {
    throw new Error("Order not found.");
  }

  return prisma.order.update({
    where: { id: existingOrder.id },
    data: { status },
    select: { id: true },
  });
}
