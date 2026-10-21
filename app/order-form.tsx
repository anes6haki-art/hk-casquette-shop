"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { submitOrder } from "./actions";
import {
  DELIVERY_LABELS,
  COMMUNES_BY_WILAYA_CODE as communesData,
  getColorLabelAr,
  getProductTitleAr,
  getWilayaLabelAr,
  ORDER_SIZE_LABELS_AR,
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
  color: string;
  size: string;
  quantity: number;
};

export default function OrderForm({
  product,
  shippingRates,
  selectedVariantIndex = 0,
}: {
  product: ProductDto;
  shippingRates: ShippingRateDto[];
  selectedVariantIndex?: number;
}) {
  const selectedVariant = product.variants[selectedVariantIndex];
  const selectedColor = selectedVariant?.colorName ?? "Standard";
  const selectedVariantId = selectedVariant?.id;
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
  const subtotal = product.discountedPrice * quantity;
  const total = subtotal + shippingFee;
  const maxQuantity = Math.max(1, Math.min(10, product.stockQuantity));
  const availableCommunes = selectedWilayaCode ? communesData[selectedWilayaCode] || [] : [];

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
      items: [{
        productId: product.id,
        ...(selectedVariantId ? { variantId: selectedVariantId } : {}),
        color: selectedColor,
        size: selectedSize,
        quantity,
      }],
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
        color: selectedColor,
        size: selectedSize,
        quantity,
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
          <div className="order-option-group">
            <span>المقاس</span>
            <div className="order-size-options">
              {AVAILABLE_SIZES.map((size) => (
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
          <div className="order-option-group product-direct-quantity">
            <span>الكمية</span>
            <div className="quantity-control" aria-label={`الكمية: ${quantity}`}>
              <button
                type="button"
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                aria-label="تقليل الكمية"
                disabled={quantity <= 1}
              >−</button>
              <output aria-live="polite">{quantity}</output>
              <button
                type="button"
                onClick={() => setQuantity((current) => Math.min(maxQuantity, current + 1))}
                aria-label="زيادة الكمية"
                disabled={quantity >= maxQuantity || product.stockQuantity < 1}
              >+</button>
            </div>
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
            <span>{quantity} × {getProductTitleAr(product.title)} · {getColorLabelAr(selectedColor)} · {ORDER_SIZE_LABELS_AR[selectedSize]}</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div>
            <span>التوصيل · {DELIVERY_LABELS[deliveryType]}</span>
            <span>{selectedShippingRate ? formatPrice(shippingFee) : "اختاروا الولاية"}</span>
          </div>
          <div className="price-total"><strong>المبلغ الإجمالي</strong><strong>{formatPrice(selectedShippingRate ? total : subtotal)}</strong></div>
        </div>

        {submissionError && <p className="form-error" role="alert">{submissionError}</p>}
        <button
          className="submit-button"
          type="submit"
          disabled={isSubmitting || !selectedShippingRate || product.stockQuantity < 1 || quantity > product.stockQuantity}
        >
          {product.stockQuantity < 1 ? "نفدت الكمية" : isSubmitting ? "جارٍ تسجيل الطلب…" : "تأكيد الطلب الآن (الدفع عند الاستلام)"}
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
                  {order.quantity} × {getProductTitleAr(product.title)} · {getColorLabelAr(order.color)} · {ORDER_SIZE_LABELS_AR[order.size as keyof typeof ORDER_SIZE_LABELS_AR]}
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
