"use client";

import { useState } from "react";
import OrderForm from "@/app/order-form";
import { getProductDescriptionAr, getProductTitleAr, type ProductDto, type ShippingRateDto } from "@/lib/store-data";
import ProductGallery from "./product-gallery";

function formatPrice(amount: number) {
  return `${new Intl.NumberFormat("ar-DZ").format(amount)} دج`;
}

export default function ProductDirectCheckout({
  product,
  shippingRates,
}: {
  product: ProductDto;
  shippingRates: ShippingRateDto[];
}) {
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const discount = product.originalPrice > product.discountedPrice
    ? Math.round((1 - product.discountedPrice / product.originalPrice) * 100)
    : 0;

  return (
    <section className="product-detail">
      <ProductGallery
        title={product.title}
        imageUrls={product.imageUrls}
        variants={product.variants}
        selectedVariantIndex={selectedVariantIndex}
        onSelectVariant={setSelectedVariantIndex}
      />
      <div className="product-detail-copy">
        <span className="shop-eyebrow"><span /> متجر إتش كيه للقبعات · المجموعة</span>
        <h1>{getProductTitleAr(product.title)}</h1>
        <div className="product-detail-price">
          <strong>{formatPrice(product.discountedPrice)}</strong>
          {product.originalPrice > product.discountedPrice && <del>{formatPrice(product.originalPrice)}</del>}
          {discount > 0 && <span className="product-discount">-{discount}%</span>}
        </div>
        <p className="product-stock">
          <span className={product.stockQuantity > 0 ? "stock-dot" : "stock-dot is-empty"} />
          {product.stockQuantity > 0 ? `${product.stockQuantity} قطعة متوفرة` : "نفدت الكمية حالياً"}
        </p>
        <p className="product-full-description">{getProductDescriptionAr(product.description)}</p>
        <div className="product-delivery-points">
          <span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h11v10H3zM14 10h4l3 3v4h-7zM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg>
            التوصيل إلى الولايات الـ58
          </span>
          <span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4zM8 10h8M8 14h4" /><path d="m16 15 1.5 1.5L20 14" /></svg>
            الدفع عند الاستلام
          </span>
        </div>
        <OrderForm
          product={product}
          shippingRates={shippingRates}
          selectedVariantIndex={selectedVariantIndex}
        />
      </div>
    </section>
  );
}
