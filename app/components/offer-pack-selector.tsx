"use client";

import { getColorLabelAr, type ProductDto } from "@/lib/store-data";

const AVAILABLE_SIZES = ["Standard", "S", "M", "L"] as const;

type PackItem = { color: string; size: string };

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
  packItems: PackItem[];
  setPackItems: (items: PackItem[]) => void;
}) {
  const colorOptions = product.variants.length > 0
    ? product.variants.map((variant) => ({
        color: variant.colorName,
        colorHex: variant.colorHex,
        stock: variant.stock,
      }))
    : [{ color: "Standard", colorHex: "#d4d4d8", stock: product.stockQuantity }];
  const offers = [
    { count: 1, title: "قطعة واحدة", subtitle: "السعر العادي", multiplier: 1 },
    { count: 2, title: "باقتان · قطعتان", subtitle: "عرض خاص", multiplier: 1.8 },
    { count: 3, title: "ثلاث قطع", subtitle: "أفضل قيمة", multiplier: 2.6 },
  ];

  function selectPack(count: number) {
    const defaultColor = packItems[0]?.color ?? colorOptions[0].color;
    setPackItems(
      Array.from({ length: count }, (_, index) =>
        packItems[index] ?? { color: defaultColor, size: "Standard" },
      ),
    );
    setPackSize(count);
  }

  function updateItem(index: number, field: keyof PackItem, value: string) {
    setPackItems(packItems.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item,
    ));
  }

  return (
    <section className="offer-packs-section" aria-labelledby="offer-packs-title">
      <div className="offer-packs-heading">
        <div>
          <h2 id="offer-packs-title">اختر الباقة</h2>
          <p>اختر عدد القطع وخصص اللون والمقاس لكل قطعة.</p>
        </div>
        <span className="offer-packs-step" aria-hidden="true">01</span>
      </div>

      <div className="offer-pack-list">
        {offers.map(({ count, title, subtitle, multiplier }) => {
          const isSelected = packSize === count;
          const price = Math.round(product.discountedPrice * multiplier);

          return (
            <article
              className={`offer-pack-card${isSelected ? " is-selected" : ""}`}
              key={count}
            >
              <button
                type="button"
                className="offer-pack-trigger"
                onClick={() => selectPack(count)}
                aria-expanded={isSelected}
                aria-controls={`offer-pack-options-${count}`}
              >
                <span className="offer-pack-indicator" aria-hidden="true">
                  {isSelected && <span />}
                </span>
                <span className="offer-pack-info">
                  <span className="offer-pack-title">{title}</span>
                  <span className="offer-pack-subtitle">{subtitle}</span>
                </span>
                <span className="offer-pack-price">
                  <strong>{new Intl.NumberFormat("ar-DZ").format(price)} دج</strong>
                  {count > 1 && (
                    <span>وفر {new Intl.NumberFormat("ar-DZ").format(product.discountedPrice * count - price)} دج</span>
                  )}
                </span>
                <span className="offer-pack-chevron" aria-hidden="true">⌄</span>
              </button>

              {isSelected && (
                <div
                  className="offer-pack-options"
                  id={`offer-pack-options-${count}`}
                  dir="rtl"
                >
                  {Array.from({ length: count }, (_, index) => {
                    const item = packItems[index] ?? {
                      color: colorOptions[0].color,
                      size: "Standard",
                    };
                    const selectedColor = colorOptions.find((option) => option.color === item.color);

                    return (
                      <fieldset className="offer-pack-item" key={index}>
                        <legend>القطعة {index + 1}</legend>
                        <div className="offer-pack-option-group">
                          <span className="offer-pack-option-label">اللون</span>
                          <div className="offer-pack-color-options" role="group" aria-label={`اللون للقطعة ${index + 1}`}>
                            {colorOptions.map((option) => {
                              const isColorSelected = item.color === option.color;

                              return (
                                <button
                                  className={`offer-pack-color-option${isColorSelected ? " is-selected border-red-500 ring-red-500" : ""}`}
                                  key={option.color}
                                  type="button"
                                  onClick={() => updateItem(index, "color", option.color)}
                                  disabled={option.stock < 1}
                                  aria-label={`${getColorLabelAr(option.color)}${option.stock < 1 ? " · نفد المخزون" : ""}`}
                                  aria-pressed={isColorSelected}
                                >
                                  <span
                                    className="offer-pack-color-swatch"
                                    style={{ backgroundColor: option.colorHex }}
                                    aria-hidden="true"
                                  />
                                  <span>{getColorLabelAr(option.color)}</span>
                                </button>
                              );
                            })}
                          </div>
                          <span className="offer-pack-stock" aria-live="polite">
                            {selectedColor?.stock ?? 0} قطعة متوفرة
                          </span>
                        </div>

                        <div className="offer-pack-option-group">
                          <span className="offer-pack-option-label">المقاس</span>
                          <div className="offer-pack-size-options" role="group" aria-label={`المقاس للقطعة ${index + 1}`}>
                            {AVAILABLE_SIZES.map((size) => {
                              const isSizeSelected = item.size === size;

                              return (
                                <button
                                  className={`offer-pack-size-option${isSizeSelected ? " is-selected border-red-500 ring-red-500" : ""}`}
                                  key={size}
                                  type="button"
                                  onClick={() => updateItem(index, "size", size)}
                                  aria-pressed={isSizeSelected}
                                >
                                  {size}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </fieldset>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
