import "server-only";

import { hasAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import type { ProductDto } from "@/lib/store-data";

export type ProductInput = Omit<ProductDto, "id" | "updatedAt" | "variants"> & {
  id?: string;
  variants: Omit<ProductDto["variants"][number], "id">[] & { size: string; stock: number }[];
};

const productSelect = {
  id: true,
  title: true,
  description: true,
  originalPrice: true,
  discountedPrice: true,
  stockQuantity: true,
  imageUrls: true,
  variants: {
    select: {
      id: true,
      colorName: true,
      colorHex: true,
      size: true,
      stock: true,
      images: true,
    },
    orderBy: { position: "asc" },
  },
  isActive: true,
  updatedAt: true,
} as const;

function toProductDto(product: {
  id: string;
  title: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  stockQuantity: number;
  imageUrls: string;
  variants: { id: string; colorName: string; colorHex: string; size: string; stock: number; images: string }[];
  isActive: boolean;
  updatedAt: Date;
}): ProductDto {
  const parseImages = (value: string, label: string) => {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || !parsed.every((image) => typeof image === "string")) {
      throw new Error(`Product ${product.id} has invalid ${label} image data.`);
    }
    return parsed;
  };

  return {
    ...product,
    imageUrls: parseImages(product.imageUrls, "product"),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      colorName: variant.colorName,
      colorHex: variant.colorHex,
      size: variant.size,
      stock: variant.stock,
      images: parseImages(variant.images, `variant ${variant.id}`),
    })),
  };
}

function validateProduct(input: ProductInput) {
  const title = input.title.trim();
  const description = input.description.trim();

  if (title.length < 2 || title.length > 120) {
    throw new Error("يجب أن يتراوح اسم المنتج بين حرفين و120 حرفاً.");
  }
  if (!description || description.length > 4000) {
    throw new Error("الوصف مطلوب ويجب ألا يتجاوز 4,000 حرف.");
  }
  if (
    !Number.isSafeInteger(input.originalPrice) ||
    input.originalPrice <= 0 ||
    input.originalPrice > 100_000_000
  ) {
    throw new Error("يجب أن يكون السعر الأصلي عدداً صحيحاً موجباً.");
  }
  if (
    !Number.isSafeInteger(input.discountedPrice) ||
    input.discountedPrice <= 0 ||
    input.discountedPrice > input.originalPrice
  ) {
    throw new Error("يجب أن يكون السعر بعد التخفيض موجباً ولا يتجاوز السعر الأصلي.");
  }
  if (!Number.isSafeInteger(input.stockQuantity) || input.stockQuantity < 0 || input.stockQuantity > 1_000_000) {
    throw new Error("يجب أن تكون الكمية في المخزون عدداً صحيحاً بين 0 و1,000,000.");
  }
  const validateImageUrls = (urls: string[]) => {
    if (!Array.isArray(urls) || urls.length > 8) {
      throw new Error("أضيفوا 8 روابط صور كحد أقصى لكل منتج أو لون.");
    }
    return urls.map((value) => {
      if (typeof value !== "string" || value.length > 2048) {
        throw new Error("رابط الصورة غير صالح.");
      }
      if (/^\/uploads\/[a-zA-Z0-9-]+\.(jpg|png|webp|avif)$/.test(value)) {
        return value;
      }

      let imageUrl: URL;
      try {
        imageUrl = new URL(value);
      } catch {
        throw new Error("يجب أن تكون روابط الصور كاملة.");
      }
      if (imageUrl.protocol !== "https:" && imageUrl.protocol !== "http:") {
        throw new Error("يجب أن تستخدم الصور بروتوكول HTTP أو HTTPS.");
      }
      return imageUrl.toString();
    });
  };

  const imageUrls = validateImageUrls(input.imageUrls);
  if (!Array.isArray(input.variants) || input.variants.length > 12) {
    throw new Error("أضيفوا 12 لوناً كحد أقصى لكل منتج.");
  }
  const variants = input.variants.map((variant) => {
    const colorName = variant.colorName.trim();
    if (!colorName || colorName.length > 40) {
      throw new Error("يجب أن يتراوح اسم كل لون بين حرف واحد و40 حرفاً.");
    }
    if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(variant.colorHex)) {
      throw new Error("يجب إدخال رمز سداسي عشري صالح لكل لون.");
    }
        if (!Array.isArray(variant.images) || variant.images.length === 0) {
      throw new Error(`أضيفوا صورة واحدة على الأقل للون « ${colorName} ».`);
    }
    const size = (variant as any).size?.trim() || "Standard";
    const allowedSizes = ["Standard", "S", "M", "L"];
    if (!allowedSizes.includes(size)) {
      throw new Error(`المقاس يجب أن يكون أحد القيم: ${allowedSizes.join(", ")}.`);
    }
    const stock = (variant as any).stock ?? 0;
    if (!Number.isSafeInteger(stock) || stock < 0 || stock > 1_000_000) {
      throw new Error(`يجب أن يكون المخزون عدداً صحيحاً بين 0 و1,000,000 لكل لون « ${colorName} ».`);
    }
    return {
      colorName,
      colorHex: variant.colorHex.toLowerCase(),
      size,
      stock,
      images: validateImageUrls(variant.images),
    };
  });

  return { title, description, imageUrls, variants };
}

export async function getStorefrontProducts(): Promise<ProductDto[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
    select: productSelect,
  });
  return products.map(toProductDto);
}

export async function getStorefrontProduct(id: string): Promise<ProductDto | null> {
  const product = await prisma.product.findFirst({
    where: { id, isActive: true },
    select: productSelect,
  });
  return product ? toProductDto(product) : null;
}

export async function getProductsForAdmin(): Promise<ProductDto[]> {
  if (!(await hasAdminSession())) {
    throw new Error("غير مصرح بالوصول إلى المنتجات.");
  }

  const products = await prisma.product.findMany({
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    select: productSelect,
  });
  return products.map(toProductDto);
}

export async function saveProduct(input: ProductInput): Promise<ProductDto> {
  if (!(await hasAdminSession())) {
    throw new Error("غير مصرح بتعديل المنتج.");
  }

  const { title, description, imageUrls, variants } = validateProduct(input);
  const data = {
    title,
    description,
    originalPrice: input.originalPrice,
    discountedPrice: input.discountedPrice,
    stockQuantity: input.stockQuantity,
    imageUrls: JSON.stringify(imageUrls),
    isActive: input.isActive,
        variants: {
      deleteMany: {},
      create: variants.map((variant, position) => ({
        colorName: variant.colorName,
        colorHex: variant.colorHex,
        size: variant.size,
        stock: variant.stock,
        images: JSON.stringify(variant.images),
        position,
      })),
    },
  };

  const saved = input.id
    ? await prisma.product.update({
      where: { id: input.id },
      data,
      select: productSelect,
    })
    : await prisma.product.create({
      data,
      select: productSelect,
    });

  return toProductDto(saved);
}

export async function deleteProduct(id: string) {
  if (!(await hasAdminSession())) {
    throw new Error("غير مصرح بحذف المنتج.");
  }
  if (!id || id.length > 100) throw new Error("معرّف المنتج غير صالح.");

  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw new Error("لم يتم العثور على المنتج.");
  await prisma.product.delete({ where: { id: existing.id } });
}
