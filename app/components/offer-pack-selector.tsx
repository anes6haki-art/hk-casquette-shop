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
          <button
            key={n}
            type="button"
            className={`pack-card${packSize === n ? " is-selected" : ""}${highlight ? " is-highlight" : ""}`}
            onClick={() => setPackSize(n)}
            aria-checked={packSize === n}
            role="radio"
          >
            <div className="pack-card-inner" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 20px', border: '1px solid #333', borderRadius: '12px', background: '#18181b', color: '#fff', minHeight: '80px', transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
              <span className="pack-card-number" style={{ fontSize: '22px', fontWeight: 700, color: '#f59e0b', minWidth: '36px', textAlign: 'center' }}>#{n}</span>
              <div className="pack-card-content" style={{ flex: 1 }}>
                <span className="pack-card-label" style={{ display: 'block', fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{label}</span>
                <span className="pack-card-sub" style={{ display: 'block', fontSize: '13px', color: '#a1a1aa', marginBottom: '6px' }}>{sub}</span>
                <span className="pack-card-price" style={{ display: 'block', fontSize: '18px', fontWeight: 700, color: '#22c55e' }}>{new Intl.NumberFormat("ar-DZ").format(price)} دج</span>
                {highlight && n > 1 && <span className="pack-card-badge" style={{ display: 'inline-block', marginTop: '6px', padding: '2px 8px', background: '#f59e0b', color: '#18181b', fontSize: '11px', fontWeight: 700, borderRadius: '6px' }}>وفر</span>}
              </div>
            </div>
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
