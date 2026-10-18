"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getColorLabelAr, getProductTitleAr, type ProductVariantDto } from "@/lib/store-data";

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
  imageUrls,
  variants,
  selectedVariantIndex,
  onSelectVariant,
}: {
  title: string;
  imageUrls: string[];
  variants: ProductVariantDto[];
  selectedVariantIndex: number;
  onSelectVariant: (index: number) => void;
}) {
  const [selectedImage, setSelectedImage] = useState(0);
  const selectedVariant = variants[selectedVariantIndex];
  const images = (selectedVariant?.images ?? imageUrls).filter(Boolean);
  const activeImage = images[selectedImage] ?? images[0];

  useEffect(() => {
    setSelectedImage(0);
  }, [selectedVariantIndex]);

  return (
    <div className="product-gallery">
      <div className="product-gallery-main">
        {activeImage
          ? (
            <Image
              src={activeImage}
              alt={`${getProductTitleAr(title)}${selectedVariant ? ` - ${getColorLabelAr(selectedVariant.colorName)}` : ""} - الصورة ${selectedImage + 1}`}
              fill
              priority
              unoptimized
              sizes="(max-width: 800px) 100vw, 52vw"
            />
          )
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
                onClick={() => onSelectVariant(index)}
                aria-label={getColorLabelAr(variant.colorName)}
                aria-pressed={selectedVariantIndex === index}
              >
                <span className="product-color-swatch" style={{ backgroundColor: variant.colorHex }} />
                <span>{getColorLabelAr(variant.colorName)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
