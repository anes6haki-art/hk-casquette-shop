
"use client";

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { submitOrder } from "./actions";
import {
  DELIVERY_LABELS,
  COMMUNES_BY_WILAYA_CODE as communesData,
  getColorLabelAr,
  getProductTitleAr,
  getWilayaLabelAr,
  SHIPPING_FEE,
  WILAYAS,
  type ProductDto,
  type DeliveryType,
  type ShippingRateDto,
} from "@/lib/store-data";

const AVAILABLE_SIZES = ["Standard", "S", "M", "L"] as const;

function formatPrice(amount: number) {
  return `${new Intl.NumberFormat("ar-DZ").format(amount)} دج`;
}

function normalizeWilayaCode(value: string): number | null {
  const code = value.match(/\d+/)?.[0];
  if (code) {
    const wilayaCode = Number(code);
    return wilayaCode >= 1 && wilayaCode <= WILAYAS.length ? wilayaCode : null;
  }

  const wilayaIndex = WILAYAS.findIndex((name) => name === value.trim());
  return wilayaIndex === -1 ? null : wilayaIndex + 1;
}

type OrderConfirmation = {
  name: string;
  phone: string;
  wilaya: string;
  commune: string;
  deliveryType: DeliveryType;
  shippingFee: number;
  totalPrice: number;
  items: { productId: string; color: string; size: string; quantity: number; variantId?: string }[];
};

export default function OrderForm({
  product,
  shippingRates,
  selectedVariantIndex = 0,
  packSize: externalPackSize,
  setPackSize: externalSetPackSize,
  packItems: externalPackItems,
  setPackItems: externalSetPackItems,
}: {
  product: ProductDto;
  shippingRates: ShippingRateDto[];
  selectedVariantIndex?: number;
  packSize?: number;
  setPackSize?: (n: number) => void;
  packItems?: { color: string; size: string }[];
  setPackItems?: (items: { color: string; size: string }[]) => void;
}) {
    const selectedVariant = product.variants[selectedVariantIndex];
  const selectedColor = selectedVariant?.colorName ?? "Standard";
  const selectedColorStock = selectedVariant?.stock ?? 0;
  const selectedVariantId = selectedVariant?.id;
    const [internalPackSize, setInternalPackSize] = useState(1);
    const [internalPackItems, setInternalPackItems] = useState<{ color: string; size: string }[]>(
      selectedVariant ? [{ color: selectedVariant.colorName || "Standard", size: "Standard" }] : []
    );
    const packSize = externalPackSize ?? internalPackSize;
    const setPackSize = externalSetPackSize ?? setInternalPackSize;
    const packItems = externalPackItems ?? internalPackItems;
    const setPackItems = externalSetPackItems ?? setInternalPackItems;
  
    useEffect(() => {
      if (packSize > packItems.length) {
        const newItems = Array.from({ length: packSize - packItems.length }, () => ({
          color: packItems[0]?.color || selectedVariant?.colorName || "Standard",
          size: "Standard",
        }));
        setPackItems([...packItems, ...newItems]);
      } else if (packSize < packItems.length) {
        setPackItems(packItems.slice(0, packSize));
      }
    }, [packSize]);
  const [selectedSize, setSelectedSize] = useState<(typeof AVAILABLE_SIZES)[number]>("Standard");
  const [quantity, setQuantity] = useState(1);
  const [selectedWilayaCode, setSelectedWilayaCode] = useState("");
  const [commune, setCommune] = useState("");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("HOME");
  const [order, setOrder] = useState<OrderConfirmation | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const wilayaCode = selectedWilayaCode ? Number(selectedWilayaCode) : null;
  const wilaya = wilayaCode === null ? "" : WILAYAS[wilayaCode - 1] ?? "";
  const selectedShippingRate = shippingRates.find((rate) => rate.wilaya === wilaya);
  const shippingFee = selectedShippingRate
    ? deliveryType === "HOME" ? selectedShippingRate.homePrice : selectedShippingRate.deskPrice
    : SHIPPING_FEE;
    // Calculate subtotal based on pack items
    const packSubtotal = product.discountedPrice * packItems.length;
    const total = packSubtotal + shippingFee;
    // Initialize pack items when selected variant or pack size changes
  const packColors = product.variants.map((v) => v.colorName);
  const hasMultipleVariants = product.variants.length > 1;
  
  // Get stock info for a pack item
  function getColorStock(color: string) {
    const variant = product.variants.find((v) => v.colorName === color);
    return variant?.stock ?? 0;
  }
  
  const maxPackQuantity = Math.max(1, Math.min(10, Math.min(...packItems.map((it) => getColorStock(it.color)))));
  
  const availableCommunes = selectedWilayaCode ? communesData[selectedWilayaCode] || [] : [];

    function updatePackItem(index: number, field: 'color' | 'size', value: string): void {
    const updated: { color: string; size: string }[] = (packItems || []).map((item: { color: string; size: string }, i: number) =>
      i === index ? { ...item, [field]: value } : item
    );
    setPackItems(updated);
  }

  function handleWilayaChange(event: ChangeEvent<HTMLSelectElement>) {
    const code = normalizeWilayaCode(event.currentTarget.value);
    setSelectedWilayaCode(code ? String(code) : "");
    setCommune("");
    setSubmissionError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formPhone = String(formData.get("phone") ?? "");
        const nextOrder = {
      name: String(formData.get("name") ?? ""),
      phone: formPhone,
      wilaya,
      commune: String(formData.get("commune") ?? ""),
            items: packItems.map((item) => {
        const variant = product.variants.find(v => v.colorName === item.color);
        return {
          productId: product.id,
          color: item.color,
          size: item.size,
          quantity: 1,
          variantId: variant?.id ?? '',
        };
      }),
      productId: product.id,
      deliveryType,
    };

    setSubmissionError(null);
    setIsSubmitting(true);
    try {
      const savedOrder = await submitOrder(nextOrder);
            setOrder({
        name: nextOrder.name,
        phone: formPhone,
        wilaya,
        commune: nextOrder.commune,
        deliveryType,
        shippingFee: savedOrder.shippingFee,
        totalPrice: savedOrder.totalPrice,
        items: packItems.map((it) => {
          const variant = product.variants.find(v => v.colorName === it.color);
          return { productId: product.id, color: it.color, size: it.size, quantity: 1, variantId: variant?.id ?? '' };
        }),
      });
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "تعذر تسجيل طلبكم. تحققوا من المعلومات وحاولوا مجدداً.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form className="order-card product-direct-form" dir="rtl" onSubmit={handleSubmit}>
                <div className="product-direct-options">
          <div className="order-option-group pack-size-selector">
            <span>المجموعة</span>
            <div className="pack-size-options">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`pack-size-option${packSize === n ? " is-selected" : ""}`}
                  onClick={() => setPackSize(n)}
                  aria-pressed={packSize === n}
                >
                  {n} قطعة{n > 1 && ` (خصم pack ${n})`}
                </button>
              ))}
            </div>
          </div>

          <div className="pack-item-customizers">
            {packItems.map((item, idx) => (
              <div key={idx} className="pack-item-editor">
                <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#1a1a1a" }}>
                  القبعة رقم {idx + 1}
                </h4>
                <div className="product-form-grid" style={{ gap: "10px" }}>
                  <label className="product-field">
                    <span>اللون</span>
                    <select
                      value={item.color}
                      onChange={(e) => updatePackItem(idx, "color", e.currentTarget.value)}
                      style={{ width: "100%", padding: "6px", fontSize: "13px" }}
                    >
                      {packColors.map((color) => (
                        <option key={color} value={color}>
                          {color}
                        </option>
                      ))}
                    </select>
                    <small>{getColorStock(item.color)} قطعة متوفرة</small>
                  </label>
                  <label className="product-field">
                    <span>المقاس</span>
                    <select
                      value={item.size}
                      onChange={(e) => updatePackItem(idx, "size", e.currentTarget.value)}
                      style={{ width: "100%", padding: "6px", fontSize: "13px" }}
                    >
                      {AVAILABLE_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {idx > 0 && (
                  <button
                    type="button"
                    className="product-delete-button"
                    style={{ alignSelf: "flex-end", marginTop: "8px" }}
                    onClick={() => {
                      setPackSize(packSize - 1);
                      setPackItems(packItems.filter((_, i) => i !== idx));
                    }}
                  >
                    إزالة القبععة
                  </button>
                )}
              </div>
            ))}
            {packItems.length < 3 && (
              <button
                type="button"
                onClick={() => {
                  const newColor = packItems.length > 0 ? packItems[0].color : product.variants[0]?.colorName || "Standard";
                  setPackSize(packSize + 1);
                  setPackItems([...packItems, { color: newColor, size: "Standard" }]);
                }}
                disabled={packSize >= 3}
                style={{ alignSelf: "flex-start", padding: "6px 14px", fontSize: "13px" }}
              >
                + إضافة قطعة إلى المجموعة
              </button>
            )}
          </div>
        </div>

        <label className="field">
          <span>الاسم الكامل</span>
          <input name="name" type="text" placeholder="مثال: أمين بن علي" autoComplete="name" required minLength={3} />
        </label>
        <label className="field">
          <span>رقم الهاتف</span>
          <div className="phone-input">
            <span aria-hidden="true">🇩🇿 +213</span>
            <input
              name="phone"
              type="tel"
              placeholder="0550 12 34 56"
              autoComplete="tel-national"
              inputMode="numeric"
              pattern="(0[5-7][0-9]{8}|[5-7][0-9]{8})"
              title="أدخلوا رقم هاتف جزائرياً صالحاً (مثال: 0550123456)"
              required
              dir="ltr"
            />
          </div>
        </label>
        <div className="field-pair">
          <label className="field">
            <span>الولاية</span>
            <select name="wilaya" value={selectedWilayaCode} onChange={handleWilayaChange} required>
              <option value="" disabled>اختاروا الولاية</option>
              {WILAYAS.map((wilayaName, index) => (
                <option value={String(index + 1)} key={wilayaName}>{String(index + 1).padStart(2, "0")} — {getWilayaLabelAr(wilayaName)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>البلدية</span>
            <select
              name="commune"
              value={commune}
              onChange={(event) => setCommune(event.currentTarget.value)}
              required
              disabled={!selectedWilayaCode || availableCommunes.length === 0}
            >
              <option value="" disabled>
                {availableCommunes.length > 0 ? "اختاروا البلدية" : "اختاروا الولاية أولاً"}
              </option>
              {availableCommunes.map((communeName) => (
                <option value={communeName} key={communeName}>{communeName}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>طريقة التوصيل</span>
          <select
            name="deliveryType"
            value={deliveryType}
            onChange={(event) => setDeliveryType(event.currentTarget.value === "DESK" ? "DESK" : "HOME")}
          >
            <option value="HOME">إلى المنزل</option>
            <option value="DESK">إلى المكتب</option>
          </select>
        </label>

                <div className="price-breakdown" aria-live="polite">
          <div className="order-line-summary">
            <span>{packSize} × {getProductTitleAr(product.title)} · مجموعة</span>
            <span>{formatPrice(packSubtotal)}</span>
          </div>
          {packItems.map(({ color, size }, idx) => (
          <div key={idx} className="pack-item-price" style={{ fontSize: "13px", color: "#555" }}>
          <span>· {getColorLabelAr(color)} · {size}</span>
          </div>
          ))}
          <div>
            <span>التوصيل · {DELIVERY_LABELS[deliveryType]}</span>
            <span>{selectedShippingRate ? formatPrice(shippingFee) : "اختاروا الولاية"}</span>
          </div>
          <div className="price-total"><strong>المبلغ الإجمالي</strong><strong>{formatPrice(selectedShippingRate ? total : packSubtotal)}</strong></div>
        </div>

                {submissionError && <p className="form-error" role="alert">{submissionError}</p>}
        <button
          className="submit-button"
          type="submit"
          disabled={isSubmitting || !selectedShippingRate || packItems.some((item) => getColorStock(item.color) < 1)}
        >
          {isSubmitting ? "جارٍ تسجيل الطلب…" : "تأكيد الطلب الآن (الدفع عند الاستلام)"}
        </button>
        <p className="form-note"><span aria-hidden="true">✓</span> لا يوجد دفع إلكتروني. الدفع عند الاستلام.</p>
      </form>

      {order && (
        <div className="modal-backdrop" role="presentation" onClick={() => setOrder(null)}>
          <section
            className="success-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="success-title"
            dir="rtl"
            onClick={(event) => event.stopPropagation()}
          >
            <button className="modal-close" type="button" onClick={() => setOrder(null)} aria-label="إغلاق">×</button>
            <div className="success-mark" aria-hidden="true">✓</div>
            <span className="section-kicker">شكراً لثقتكم</span>
            <h2 id="success-title">تم استلام طلبكم يا {order.name.split(" ")[0]}!</h2>
            <p>تم تسجيل طلبكم. سيتصل بكم فريقنا على الرقم <strong>{order.phone}</strong> لتأكيد التوصيل.</p>
            <div className="summary-box">
              <div className="summary-items">
                <span>المنتجات</span>
                                <strong>
                  {packSize} × {getProductTitleAr(product.title)} · مجموعة
                </strong>
              </div>
              <div><span>التوصيل</span><strong>{DELIVERY_LABELS[order.deliveryType]} · {order.commune}، {getWilayaLabelAr(order.wilaya)}</strong></div>
              <div><span>رسوم التوصيل</span><strong>{formatPrice(order.shippingFee)}</strong></div>
              <div><span>المبلغ عند الاستلام</span><strong>{formatPrice(order.totalPrice)}</strong></div>
            </div>
            <button className="submit-button" type="button" onClick={() => setOrder(null)}>مواصلة التسوق</button>
          </section>
        </div>
      )}
    </>
  );
}
