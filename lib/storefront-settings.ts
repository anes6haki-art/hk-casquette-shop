import "server-only";

import { hasAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import type { ProductDto } from "@/lib/store-data";

export type StorefrontSettingsDto = {
  bestSellerProductIds: string[];
  bestSellerTitle: string;
  bestSellerSubtitle: string;
  bestSellerImage: string;
};

const DEFAULT_SETTINGS: StorefrontSettingsDto = {
  bestSellerProductIds: [],
  bestSellerTitle: "أفضل المبيعات",
  bestSellerSubtitle: "اختياراتنا المميزة لكم",
  bestSellerImage: "",
};

function toSettingsDto(settings: {
  bestSellerProductIds: string;
  bestSellerTitle: string;
  bestSellerSubtitle: string;
  bestSellerImage: string;
} | null): StorefrontSettingsDto {
  if (!settings) return DEFAULT_SETTINGS;

  const parsedIds: unknown = JSON.parse(settings.bestSellerProductIds);
  if (!Array.isArray(parsedIds) || !parsedIds.every((id) => typeof id === "string")) {
    throw new Error("Storefront best seller settings contain invalid product IDs.");
  }

  return {
    bestSellerProductIds: [...new Set(parsedIds)],
    bestSellerTitle: settings.bestSellerTitle,
    bestSellerSubtitle: settings.bestSellerSubtitle,
    bestSellerImage: settings.bestSellerImage,
  };
}

export async function getStorefrontSettings(): Promise<StorefrontSettingsDto> {
  const settings = await prisma.storefrontSettings.findUnique({
    where: { id: 1 },
    select: {
      bestSellerProductIds: true,
      bestSellerTitle: true,
      bestSellerSubtitle: true,
      bestSellerImage: true,
    },
  });
  return toSettingsDto(settings);
}

export function getBestSellerProducts(products: ProductDto[], settings: StorefrontSettingsDto) {
  const byId = new Map(products.map((product) => [product.id, product]));
  return settings.bestSellerProductIds
    .map((id) => byId.get(id))
    .filter((product): product is ProductDto => product !== undefined && product.isActive);
}

export async function updateStorefrontSettings(input: StorefrontSettingsDto) {
  if (!(await hasAdminSession())) {
    throw new Error("غير مصرح بتعديل إعدادات واجهة المتجر.");
  }

  if (
    !input
    || !Array.isArray(input.bestSellerProductIds)
    || input.bestSellerProductIds.length > 8
    || !input.bestSellerProductIds.every((id) => typeof id === "string" && id.length > 0 && id.length <= 100)
  ) {
    throw new Error("اختاروا 8 منتجات مميزة كحد أقصى.");
  }
  const title = input.bestSellerTitle.trim();
  const subtitle = input.bestSellerSubtitle.trim();
  const image = input.bestSellerImage.trim();
  if (!title || title.length > 100 || subtitle.length > 240) {
    throw new Error("أدخلوا عنواناً صالحاً ووصفاً لا يتجاوز 240 حرفاً.");
  }
  if (image.length > 2048) {
    throw new Error("رابط صورة البانر طويل جداً.");
  }
  if (
    image
    && !/^\/uploads\/[a-zA-Z0-9-]+\.(jpg|png|webp|avif)$/.test(image)
  ) {
    let url: URL;
    try {
      url = new URL(image);
    } catch {
      throw new Error("رابط صورة البانر غير صالح.");
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("يجب أن يستخدم رابط صورة البانر بروتوكول HTTP أو HTTPS.");
    }
  }

  const productIds = [...new Set(input.bestSellerProductIds)];
  const foundProducts = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    select: { id: true },
  });
  if (foundProducts.length !== productIds.length) {
    throw new Error("تأكدوا من أن جميع المنتجات المختارة مفعّلة في الكتالوج.");
  }

  await prisma.storefrontSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      bestSellerProductIds: JSON.stringify(productIds),
      bestSellerTitle: title,
      bestSellerSubtitle: subtitle,
      bestSellerImage: image,
    },
    update: {
      bestSellerProductIds: JSON.stringify(productIds),
      bestSellerTitle: title,
      bestSellerSubtitle: subtitle,
      bestSellerImage: image,
    },
  });
}
