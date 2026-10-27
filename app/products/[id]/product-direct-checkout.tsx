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
        isDisabled={product.stockQuantity < 1}
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
import OfferPackSelector from "@/app/components/offer-pack-selector";

            الدفع عند الاستلام
          </span>
        <OfferPackSelector
          product={product}
          packSize={packSize} // Ensure that you pass the required props correctly
          setPackSize={setPackSize}
          packItems={packItems}
          setPackItems={setPackItems}
        />
        </div>
        <OrderForm
          product={product}
          shippingRates={shippingRates}
          selectedVariantIndex={selectedVariantIndex}
        />
        
        <a 
          href={`https://wa.me/213540404661?text=السلام عليكم، أريد الاستفسار عن المنتج: ${getProductTitleAr(product.title)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-button-product-page"
        >
          <svg viewBox="0 0 24 24" fill="#25D366" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.101-.471-.149-.673.149-.202.297-.771.966-.944 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.673-1.612-.916-2.207-.242-.579-.487-.5-.673-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.298-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.148.198 2.098 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.082 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.099-.124-.273-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378L4.2 14.97l1.637-1.47 2.44 1.47a8.833 8.833 0 004.253 1.485l.195-.008.195-.013a9.856 9.856 0 006.03-3.582l.558-.882-1.58-2.333a9.86 9.86 0 00-6.242-4.65l-.104.005c-.5.082-1.033.118-1.57.12-1.463.002-2.76-.435-3.66-1.246-.9-.811-1.5-2.038-1.5-3.422C4.861 5.354 11.964 3 19.902 3h.046c8.316 0 15.056 6.74 15.056 15.061s-6.74 15.059-15.056 15.059c-3.94 0-7.621-1.439-10.43-4.039m0 0" />
          </svg>
          <span>تواصل معنا عبر واتساب</span>
        </a>
      </div>
    </section>
  );
}