import { useState, useEffect } from "react";
import { getColorLabelAr, getProductTitleAr, type ProductDto } from "@/lib/store-data";

const AVAILABLE_SIZES: string[] = ["Standard", "S", "M", "L"];

export default function OfferPackSelector({
  product,
  packSize,
  setPackSize,
  packItems,
  setPackItems,
}: {
  product: ProductDto;
  packSize: number;
  setPackSize: (n: number) => void;
  packItems: { color: string; size: string }[];
  setPackItems: (items: { color: string; size: string }[]) => void;
}) {
  const packColors = product.variants.map((v) => v.colorName);
  const hasMultipleVariants = product.variants.length > 1;

  function getColorStock(color: string) {
    const variant = product.variants.find((v) => v.colorName === color);
    return variant?.stock ?? 0;
  }

  useEffect(() => {
    if (packSize > packItems.length) {
      const newColor = packItems[0]?.color || product.variants[0]?.colorName || "Standard";
      setPackItems([...packItems, ...Array.from({ length: packSize - packItems.length }, () => ({ color: newColor, size: "Standard" }))]);
    } else if (packSize < packItems.length) {
      setPackItems(packItems.slice(0, packSize));
    }
  }, [packSize]);

  function updateItem(index: number, field: "color" | "size", value: string): void {
    setPackItems(packItems.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  const prices = [
    { n: 1, label: "قطعة واحدة", sub: "السعر العادي", price: product.discountedPrice, highlight: false },
    { n: 2, label: "باقات 2 قطع", sub: "خصم خاص", price: Math.round(product.discountedPrice * 1.8), highlight: true },
    { n: 3, label: "باقات 3 قطع", sub: "خصم خاص", price: Math.round(product.discountedPrice * 2.6), highlight: true },
  ];

  return (
    <section className="offer-packs-section" aria-labelledby="offer-packs-title">
      <h2 id="offer-packs-title">اختر الباقة</h2>
      <p className="offer-packs-sub">اختر عدد القطع التي تريدها، ثم خصص كل قبعة على حدة.</p>
      
      <div className="pack-cards" role="radiogroup" aria-label="اختيار الباقة">
        {prices.map(({ n, label, sub, price, highlight }) => (
            <div
            role="radio"
            tabIndex={0}
            onClick={() => setPackSize(n)}
            aria-checked={packSize === n}
            className={`
            pack-card
            flex
            flex-col
            items-center
            gap-2
            rounded-xl
            border
            border-gray-600
            bg-white
            transition-all
            duration-200
            group
            peer
            cursor-pointer
            min-w-[120px]
            min-h-[120px]
            ${packSize === n ? "border-amber-600 bg-amber-50" : ""}
            `}
            >
            <div
            className={`
            h-8
            w-8
            rounded-full
            border-2
            border-gray-600
            bg-white
            flex
            items-center
            justify-center
            peer-checked:border-amber-600
            peer-checked:bg-amber-100
            peer-checked:text-amber-600
            transition-colors
            duration-200
            `}
            >
            <svg
            className={`
            h-4
            w-4
            peer-checked:fill-amber-600
            fill-gray-500
            transition-fill
            duration-200
            `}
            viewBox="0 0 24 24"
            aria-hidden="true"
            >
            <path
            d="M5 3h14c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2m4 12h6v2h-6v-2zm-6-6h6v6H5v-6zm11.46-1.9 1.41 1.41-1.06 1.06L17.24 11H9.39l-1.06 1.06L15.66 13.09l1.41 1.41L20 16.59z"
            />
            </svg>
            </div>
            <div className="pack-card-content flex-1 text-center py-3">
            <span className="pack-card-number text-xl font-bold text-amber-600">#{n}</span>
            <div>
            <span className="pack-card-label font-medium text-sm block">{label}</span>
            <span className="pack-card-sub text-xs text-gray-400 block">{sub}</span>
            </div>
            <span className="pack-card-price font-bold text-lg text-emerald-600">{new Intl.NumberFormat("ar-DZ").format(price)} دج</span>
            {highlight && n > 1 && (
            <span className="inline-block mt-2 px-2 py-1 text-xs font-semibold text-amber-800 bg-amber-100 rounded-full">وفر</span>
            )}
            </div>
            </div>
        ))}
      </div>

      {packSize > 1 && (
        <div className="pack-customizers">
          <h3>تخصيص كل قطعة في الباقة</h3>
          <div className="pack-items-grid">
            {packItems.map((item, idx) => (
              <div key={idx} className="pack-item-card">
                <span className="pack-item-number">قبعة {idx + 1}</span>
                <label>
                  <span>اللون</span>
                  <select
                    value={item.color}
                    onChange={(e) => updateItem(idx, "color", e.currentTarget.value)}
                    aria-label={`اللون للقبعة ${idx + 1}`}
                  >
                    {packColors.map((color) => (
                      <option key={color} value={color}>{getColorLabelAr(color) || color}</option>
                    ))}
                  </select>
                  <small>{getColorStock(item.color)} قطعة متوفرة</small>
                </label>
                <label>
                  <span>المقاس</span>
                  <select
                    value={item.size}
                    onChange={(e) => updateItem(idx, "size", e.currentTarget.value)}
                    aria-label={`المقاس للقبعة ${idx + 1}`}
                  >
                    {AVAILABLE_SIZES.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
