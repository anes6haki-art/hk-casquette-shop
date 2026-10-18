"use client";

import Image from "next/image";
import { useState } from "react";
import { getColorLabelAr, getProductTitleAr, ORDER_SIZE_LABELS_AR, type ProductVariantDto } from "@/lib/store-data";
import { useCart, type CartVariantOption } from "@/app/cart/cart-context";

const PRODUCT_SIZES = ["Standard", "S", "M", "L"] as const;

function formatPrice(amount: number) {
  return `${new Intl.NumberFormat("ar-DZ").format(amount)} دج`;
}

function CapIllustration() {
  return (
    <svg className="cap-illustration" viewBox="0 0 240 180" role="img" aria-label="رسم توضيحي لقبعة">
      <path d="M47 103c4-44 29-68 71-68s67 24 71 68l3 18H45l2-18Z" />
      <path d="M46 111c-25 6-38 22-31 35 8 16 58 22 105 15 23-3 40-9 55-18-20 4-44 2-66-4-25-7-43-19-63-28Z" />
      <path d="M118 42v48m-51 2c15-12 33-18 53-18 20 0 38 6 54 18" />
    </svg>
  );
}

export default function ProductGallery({
  title,
  productId,
  price,
  stockQuantity,
  imageUrls,
  variants,
}: {
  title: string;
  productId: string;
  price: number;
  stockQuantity: number;
  imageUrls: string[];
  variants: ProductVariantDto[];
}) {
  const { addItem } = useCart();
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState<(typeof PRODUCT_SIZES)[number]>("Standard");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const selectedVariant = variants[selectedVariantIndex];
  const images = (selectedVariant?.images ?? imageUrls).filter(Boolean);
  const activeImage = images[selectedImage] ?? images[0];

  return (
    <div className="product-gallery">
      {variants.length > 0 && (
        <div className="product-color-selector" role="group" aria-label="اختيار اللون">
          <span className="product-color-label">
            اللون: <strong>{selectedVariant ? getColorLabelAr(selectedVariant.colorName) : ""}</strong>
          </span>
          <div className="product-color-options">
            {variants.map((variant, index) => (
              <button
                className={`product-color-option${selectedVariantIndex === index ? " is-selected" : ""}`}
                key={variant.id}
                type="button"
                onClick={() => {
                  setSelectedVariantIndex(index);
                  setSelectedImage(0);
                }}
                aria-label={`${getColorLabelAr(variant.colorName)}, ${variant.colorHex}`}
                aria-pressed={selectedVariantIndex === index}
                title={`${getColorLabelAr(variant.colorName)} (${variant.colorHex})`}
              >
                <span className="product-color-swatch" style={{ backgroundColor: variant.colorHex }} />
                <span>{getColorLabelAr(variant.colorName)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="product-gallery-main">
        {activeImage
          ? <Image src={activeImage} alt={`${getProductTitleAr(title)}${selectedVariant ? ` - ${getColorLabelAr(selectedVariant.colorName)}` : ""} - الصورة ${selectedImage + 1}`} fill priority unoptimized sizes="(max-width: 800px) 100vw, 52vw" />
          : <CapIllustration />}
      </div>
      {images.length > 1 && (
        <div className="product-gallery-thumbnails" role="group" aria-label={`معرض الصور${selectedVariant ? ` - ${getColorLabelAr(selectedVariant.colorName)}` : ""}`}>
          {images.map((image, index) => (
            <button
              className={selectedImage === index ? "is-selected" : ""}
              key={`${image}-${index}`}
              type="button"
              onClick={() => setSelectedImage(index)}
              aria-label={`عرض الصورة ${index + 1} من ${images.length}`}
              aria-pressed={selectedImage === index}
            >
              <Image src={image} alt="" fill unoptimized sizes="88px" />
            </button>
          ))}
        </div>
      )}
      <div className="product-add-cart-panel">
        <div className="product-add-cart-size">
          <span>اختاروا المقاس</span>
          <div className="order-size-options">
            {PRODUCT_SIZES.map((size) => (
              <button
                className={`order-size-option${selectedSize === size ? " is-selected" : ""}`}
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                aria-pressed={selectedSize === size}
              >
                {ORDER_SIZE_LABELS_AR[size]}
              </button>
            ))}
          </div>
        </div>
        <div className="product-add-cart-actions">
          <div className="quantity-control" aria-label={`الكمية: ${quantity}`}>
            <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} disabled={quantity <= 1} aria-label="تقليل الكمية">−</button>
            <output aria-live="polite">{quantity}</output>
            <button type="button" onClick={() => setQuantity((current) => Math.min(Math.min(10, stockQuantity), current + 1))} disabled={quantity >= Math.min(10, stockQuantity)} aria-label="زيادة الكمية">+</button>
          </div>
          <button
            className="product-add-cart-button"
            type="button"
            disabled={stockQuantity < 1 || quantity > stockQuantity}
            onClick={() => {
              addItem({
                productId,
                ...(selectedVariant ? { variantId: selectedVariant.id } : {}),
                title,
                price,
                selectedColor: selectedVariant?.colorName ?? "Standard",
                selectedSize,
                quantity,
                image: activeImage ?? imageUrls[0] ?? "",
                variants: variants.map((variant): CartVariantOption => ({
                  variantId: variant.id,
                  color: variant.colorName,
                  image: variant.images[0] ?? imageUrls[0] ?? "",
                })),
              });
              setAdded(true);
              window.setTimeout(() => setAdded(false), 1800);
            }}
          >
            {stockQuantity < 1 ? "غير متوفر" : added ? "أُضيف إلى السلة ✓" : `أضف إلى السلة · ${formatPrice(price * quantity)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
