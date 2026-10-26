import { useState, useEffect } from "react";
import { getColorLabelAr, getProductTitleAr, type ProductDto } from "@/lib/store-data";
import { AVAILABLE_SIZES } from "@/app/order-form";

// Re-export size constant for reuse
export { AVAILABLE_SIZES } from "@/app/order-form";

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

  function updateItem(index: number, field: "color" | "size", value: string) {
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
          <button
            key={n}
            type="button"
            className={`pack-card${packSize === n ? " is-selected" : ""}${highlight ? " is-highlight" : ""}`}
            onClick={() => setPackSize(n)}
            aria-checked={packSize === n}
            role="radio"
          >
            <span className="pack-card-label">{label}</span>
            <span className="pack-card-sub">{sub}</span>
            <span className="pack-card-price">{new Intl.NumberFormat("ar-DZ").format(price)} دج</span>
            {highlight && n > 1 && <span className="pack-card-badge">وفر</span>}
          </button>
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
