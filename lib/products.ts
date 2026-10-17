import "server-only";

import { hasAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import type { ProductDto } from "@/lib/store-data";

export type ProductInput = Omit<ProductDto, "id" | "updatedAt" | "variants"> & {
  id?: string;
  variants: Omit<ProductDto["variants"][number], "id">[];
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
  variants: { id: string; colorName: string; colorHex: string; images: string }[];
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
      images: parseImages(variant.images, `variant ${variant.id}`),
    })),
  };
}

function validateProduct(input: ProductInput) {
  const title = input.title.trim();
  const description = input.description.trim();

  if (title.length < 2 || title.length > 120) {
    throw new Error("Le titre doit contenir entre 2 et 120 caractères.");
  }
  if (!description || description.length > 4000) {
    throw new Error("La description est obligatoire et doit faire moins de 4 000 caractères.");
  }
  if (
    !Number.isSafeInteger(input.originalPrice) ||
    input.originalPrice <= 0 ||
    input.originalPrice > 100_000_000
  ) {
    throw new Error("Le prix original doit être un nombre entier positif.");
  }
  if (
    !Number.isSafeInteger(input.discountedPrice) ||
    input.discountedPrice <= 0 ||
    input.discountedPrice > input.originalPrice
  ) {
    throw new Error("Le prix remisé doit être positif et inférieur ou égal au prix original.");
  }
  if (!Number.isSafeInteger(input.stockQuantity) || input.stockQuantity < 0 || input.stockQuantity > 1_000_000) {
    throw new Error("Le stock doit être un nombre entier entre 0 et 1 000 000.");
  }
  const validateImageUrls = (urls: string[]) => {
    if (!Array.isArray(urls) || urls.length > 8) {
      throw new Error("Ajoutez au maximum 8 URL d’images par produit ou variante.");
    }
    return urls.map((value) => {
      if (typeof value !== "string" || value.length > 2048) {
        throw new Error("Une URL d’image est invalide.");
      }
      if (/^\/uploads\/[a-zA-Z0-9-]+\.(jpg|png|webp|avif)$/.test(value)) {
        return value;
      }

      let imageUrl: URL;
      try {
        imageUrl = new URL(value);
      } catch {
        throw new Error("Les URL d’images doivent être des adresses complètes.");
      }
      if (imageUrl.protocol !== "https:" && imageUrl.protocol !== "http:") {
        throw new Error("Les images doivent utiliser HTTP ou HTTPS.");
      }
      return imageUrl.toString();
    });
  };

  const imageUrls = validateImageUrls(input.imageUrls);
  if (!Array.isArray(input.variants) || input.variants.length > 12) {
    throw new Error("Ajoutez au maximum 12 couleurs par produit.");
  }
  const variants = input.variants.map((variant) => {
    const colorName = variant.colorName.trim();
    if (!colorName || colorName.length > 40) {
      throw new Error("Le nom de chaque couleur doit contenir entre 1 et 40 caractères.");
    }
    if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(variant.colorHex)) {
      throw new Error("Chaque couleur doit avoir un code hexadécimal valide.");
    }
    if (!Array.isArray(variant.images) || variant.images.length === 0) {
      throw new Error(`Ajoutez au moins une photo pour la couleur « ${colorName} ».`);
    }
    return {
      colorName,
      colorHex: variant.colorHex.toLowerCase(),
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
    throw new Error("Unauthorized product access.");
  }

  const products = await prisma.product.findMany({
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    select: productSelect,
  });
  return products.map(toProductDto);
}

export async function saveProduct(input: ProductInput): Promise<ProductDto> {
  if (!(await hasAdminSession())) {
    throw new Error("Unauthorized product update.");
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
    throw new Error("Unauthorized product deletion.");
  }
  if (!id || id.length > 100) throw new Error("Identifiant produit invalide.");

  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw new Error("Produit introuvable.");
  await prisma.product.delete({ where: { id: existing.id } });
}
