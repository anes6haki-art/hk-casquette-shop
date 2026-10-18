"use client";

import type { ProductDto } from "@/lib/store-data";
import { useCart } from "./cart-context";

export default function ProductCardCartButton({
  product,
}: {
  product: ProductDto;
}) {
  const { addItem, setIsOpen } = useCart();
  const defaultVariant = product.variants[0];

  function addToCart() {
    if (product.stockQuantity < 1) return;
    addItem({
      productId: product.id,
      ...(defaultVariant ? { variantId: defaultVariant.id } : {}),
      title: product.title,
      price: product.discountedPrice,
      selectedColor: defaultVariant?.colorName ?? "Standard",
      selectedSize: "Standard",
      quantity: 1,
      image: defaultVariant?.images[0] ?? product.imageUrls[0] ?? "",
      variants: product.variants.map((variant) => ({
        variantId: variant.id,
        color: variant.colorName,
        image: variant.images[0] ?? product.imageUrls[0] ?? "",
      })),
    });
    setIsOpen(true);
  }

  return (
    <button
      className="cap-card-cart-button"
      type="button"
      aria-label={`إضافة ${product.title} إلى السلة`}
      title="إضافة إلى السلة"
      disabled={product.stockQuantity < 1}
      onClick={addToCart}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 8H6" />
        <circle cx="10" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </svg>
    </button>
  );
}
