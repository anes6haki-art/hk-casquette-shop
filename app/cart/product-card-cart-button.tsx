"use client";

import { useState } from "react";
import type { ProductDto } from "@/lib/store-data";
import { useCart } from "./cart-context";

const PRODUCT_SIZES = ["Standard", "S", "M", "L"] as const;

function formatPrice(amount: number) {
  return `${new Intl.NumberFormat("fr-DZ").format(amount)} DA`;
}

export default function ProductCardCartButton({
  product,
}: {
  product: ProductDto;
}) {
  const { addItem, itemCount, setIsOpen } = useCart();
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState(product.variants[0]?.id ?? "");
  const [selectedSize, setSelectedSize] = useState<(typeof PRODUCT_SIZES)[number]>("Standard");

  const selectedVariant = product.variants.find((variant) => variant.id === selectedVariantId);
  const image = selectedVariant?.images[0] ?? product.imageUrls[0] ?? "";
  const isOutOfStock = product.stockQuantity < 1;
  const isCartFull = itemCount >= 10;

  function addToCart() {
    if (isOutOfStock || isCartFull) return;

    addItem({
      productId: product.id,
      ...(selectedVariant ? { variantId: selectedVariant.id } : {}),
      title: product.title,
      price: product.discountedPrice,
      selectedColor: selectedVariant?.colorName ?? "Standard",
      selectedSize,
      quantity: 1,
      image,
    });
    setIsSelecting(false);
    setIsOpen(true);
  }

  return (
    <>
      <button
        className="cap-card-cart-button"
        type="button"
        aria-label={`Choisir la couleur et la taille de ${product.title} pour l’ajouter au panier`}
        title="Ajouter au panier"
        disabled={isOutOfStock}
        onClick={() => setIsSelecting(true)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 8H6" />
          <circle cx="10" cy="20" r="1" />
          <circle cx="18" cy="20" r="1" />
        </svg>
      </button>
      {isSelecting && (
        <div className="product-card-modal-layer">
          <button
            className="product-card-modal-backdrop"
            type="button"
            aria-label="Fermer la sélection"
            onClick={() => setIsSelecting(false)}
          />
          <section
            className="product-card-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`product-card-modal-title-${product.id}`}
          >
            <button
              className="product-card-modal-close"
              type="button"
              aria-label="Fermer"
              onClick={() => setIsSelecting(false)}
            >
              ×
            </button>
            <span className="shop-eyebrow">AJOUTER AU PANIER</span>
            <h2 id={`product-card-modal-title-${product.id}`}>{product.title}</h2>
            <strong className="product-card-modal-price">{formatPrice(product.discountedPrice)}</strong>
            {product.variants.length > 0 && (
              <div className="product-card-modal-options">
                <span>Couleur : <strong>{selectedVariant?.colorName}</strong></span>
                <div className="product-card-modal-colors" role="group" aria-label="Choisir une couleur">
                  {product.variants.map((variant) => (
                    <button
                      className={`product-card-modal-color${selectedVariantId === variant.id ? " is-selected" : ""}`}
                      key={variant.id}
                      type="button"
                      aria-pressed={selectedVariantId === variant.id}
                      onClick={() => setSelectedVariantId(variant.id)}
                    >
                      <span style={{ backgroundColor: variant.colorHex }} />
                      {variant.colorName}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="product-card-modal-options">
              <span>Choisir une taille</span>
              <div className="product-card-modal-sizes" role="group" aria-label="Choisir une taille">
                {PRODUCT_SIZES.map((size) => (
                  <button
                    className={selectedSize === size ? "is-selected" : ""}
                    key={size}
                    type="button"
                    aria-pressed={selectedSize === size}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            {isCartFull && (
              <p className="product-card-modal-error" role="alert">
                Votre panier contient déjà le maximum de 10 casquettes.
              </p>
            )}
            <button
              className="product-card-modal-add"
              type="button"
              disabled={isCartFull}
              onClick={addToCart}
            >
              Ajouter au panier
            </button>
          </section>
        </div>
      )}
    </>
  );
}
