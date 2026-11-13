
"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { submitOrder } from "./actions";
import { trackInitiateCheckout, trackPurchase } from "./meta-pixel";
import {
  DELIVERY_LABELS,
  COMMUNES_BY_WILAYA_CODE as communesData,
  getCommuneLabelAr,
  getOfferPackPrice,
  getProductTitleAr,
  getWilayaLabelAr,
  SHIPPING_FEE,
  WILAYAS,
  type ProductDto,
  type DeliveryType,
  type ShippingRateDto,
} from "@/lib/store-data";

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
  id: string;
  price: number;
  name: string;
  phone: string;
  wilaya: string;
  commune: string;
  deliveryType: DeliveryType;
  shippingFee: number;
  items: { productId: string; color: string; size: string; quantity: number; variantId?: string }[];
};

export default function OrderForm({
  product,
  shippingRates,
  packSize,
  packItems,
}: {
  product: ProductDto;
  shippingRates: ShippingRateDto[];
  packSize: number;
  packItems: { color: string; size: string }[];
}) {
  const [selectedWilayaCode, setSelectedWilayaCode] = useState("");
  const [commune, setCommune] = useState("");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("HOME");
  const [order, setOrder] = useState<OrderConfirmation | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const checkoutTracked = useRef(false);
  const wilayaCode = selectedWilayaCode ? Number(selectedWilayaCode) : null;
  const wilaya = wilayaCode === null ? "" : WILAYAS[wilayaCode - 1] ?? "";
  const selectedShippingRate = shippingRates.find((rate) => rate.wilaya === wilaya);
  const shippingFee = selectedShippingRate
    ? deliveryType === "HOME" ? selectedShippingRate.homePrice : selectedShippingRate.deskPrice
    : SHIPPING_FEE;
  const packSubtotal = getOfferPackPrice(product.discountedPrice, packSize);
  const total = packSubtotal + shippingFee;

  const availableCommunes = selectedWilayaCode ? communesData[selectedWilayaCode] || [] : [];

  useEffect(() => {
    if (!order) return;
    trackPurchase(order);
  }, [order]);

  function handleWilayaChange(event: ChangeEvent<HTMLSelectElement>) {
    const code = normalizeWilayaCode(event.currentTarget.value);
    setSelectedWilayaCode(code ? String(code) : "");
    setCommune("");
    setSubmissionError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const formPhone = String(formData.get("phone") ?? "");
    const formCommune = String(formData.get("commune") ?? "");
    const validPhone = /^(0[5-7][0-9]{8}|[5-7][0-9]{8})$/.test(formPhone);
    const wilayaIndex = Number(selectedWilayaCode) - 1;
    const selectedWilaya = Number.isInteger(wilayaIndex) ? WILAYAS[wilayaIndex] : undefined;
    const validCommunes = selectedWilayaCode
      ? communesData[selectedWilayaCode] ?? []
      : [];
    let validationError: string | null = null;
    let fieldToFocus: string | null = null;

    if (name.length < 3) {
      validationError = "أدخلوا الاسم الكامل (ثلاثة أحرف على الأقل).";
      fieldToFocus = "name";
    } else if (!validPhone) {
      validationError = "أدخلوا رقم هاتف جزائرياً صالحاً (مثال: 0550123456).";
      fieldToFocus = "phone";
    } else if (!selectedWilaya || selectedWilaya !== wilaya) {
      validationError = "اختاروا الولاية قبل تأكيد الطلب.";
      fieldToFocus = "wilaya";
    } else if (!formCommune || !validCommunes.includes(formCommune)) {
      validationError = "اختاروا البلدية التابعة للولاية المحددة.";
      fieldToFocus = "commune";
    } else if (!selectedShippingRate) {
      validationError = "تعذر تحديد رسوم التوصيل لهذه الولاية. اختاروا ولاية أخرى أو تواصلوا معنا.";
      fieldToFocus = "wilaya";
    } else if (![1, 2, 3].includes(packSize) || packItems.length !== packSize) {
      validationError = "تحققوا من عدد القطع المحددة في الباقة.";
    } else if (product.stockQuantity < packSize) {
      validationError = "الكمية المطلوبة غير متوفرة حالياً. عدّلوا عدد القطع في الباقة.";
    } else {
      const selectedSizes = new Set(["Standard", "S", "M", "L"]);
      const requestedByVariant = new Map<string, number>();
      const selectionsAreValid = packItems.every((item) => {
        if (!item.color || !selectedSizes.has(item.size)) return false;
        if (product.variants.length === 0) {
          return item.color === "Standard" && product.stockQuantity >= packSize;
        }

        const variant = product.variants.find(
          (candidate) =>
            candidate.colorName === item.color
            && candidate.size === item.size
            && candidate.stock > 0,
        );
        if (!variant) return false;

        const requestedQuantity = (requestedByVariant.get(variant.id) ?? 0) + 1;
        requestedByVariant.set(variant.id, requestedQuantity);
        return requestedQuantity <= variant.stock;
      });

      if (!selectionsAreValid) {
        validationError = "اختاروا لوناً ومقاساً متاحين لكل قطعة في الباقة.";
      }
    }

    if (validationError) {
      setSubmissionError(validationError);
      if (fieldToFocus) {
        form.querySelector<HTMLElement>(`[name="${fieldToFocus}"]`)?.focus();
      }
      return;
    }

    setSubmissionError(null);
    const nextOrder = {
      name,
      phone: formPhone,
      wilaya,
      commune: formCommune,
      notes: String(formData.get("notes") ?? "").trim(),
      offerPack: true,
      items: packItems.map((item) => {
        const variant = product.variants.find((candidate) =>
          candidate.colorName === item.color && candidate.size === item.size && candidate.stock > 0,
        );
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
        id: savedOrder.id,
        price: savedOrder.totalPrice,
        name: nextOrder.name,
        phone: formPhone,
        wilaya,
        commune: nextOrder.commune,
        deliveryType,
        shippingFee: savedOrder.shippingFee,
        items: packItems.map((it) => {
          const variant = product.variants.find((variant) =>
            variant.colorName === it.color && variant.size === it.size && variant.stock > 0,
          );
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
      <form
        className="order-card product-direct-form"
        dir="rtl"
        aria-describedby={submissionError ? "order-form-error" : undefined}
        noValidate
        onFocusCapture={() => {
          if (checkoutTracked.current) return;
          checkoutTracked.current = true;
          trackInitiateCheckout(packSubtotal, packItems.map(() => product.id));
        }}
        onChange={() => setSubmissionError(null)}
        onSubmit={handleSubmit}
      >
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
                <option value={communeName} key={communeName}>{getCommuneLabelAr(communeName, wilaya)}</option>
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

        <label className="field">
          <span>ملاحظات إضافية (اختياري)</span>
          <textarea name="notes" maxLength={1000} rows={3} />
        </label>

        <div className="price-breakdown" aria-live="polite">
          <div className="order-line-summary">
            <span>{packSize} × {getProductTitleAr(product.title)} · مجموعة</span>
            <span>{formatPrice(packSubtotal)}</span>
          </div>
          <div>
            <span>التوصيل · {DELIVERY_LABELS[deliveryType]}</span>
            <span>{selectedShippingRate ? formatPrice(shippingFee) : "اختاروا الولاية"}</span>
          </div>
          <div className="price-total"><strong>المبلغ الإجمالي</strong><strong>{formatPrice(selectedShippingRate ? total : packSubtotal)}</strong></div>
        </div>

        {submissionError && (
          <p id="order-form-error" className="form-error" role="alert" aria-live="assertive">
            {submissionError}
          </p>
        )}
        <button
          className="submit-button"
          type="submit"
          disabled={isSubmitting}
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
              <div><span>التوصيل</span><strong>{DELIVERY_LABELS[order.deliveryType]} · {getCommuneLabelAr(order.commune, order.wilaya)}، {getWilayaLabelAr(order.wilaya)}</strong></div>
              <div><span>رسوم التوصيل</span><strong>{formatPrice(order.shippingFee)}</strong></div>
              <div><span>المبلغ عند الاستلام</span><strong>{formatPrice(order.price)}</strong></div>
            </div>
            <button className="submit-button" type="button" onClick={() => setOrder(null)}>مواصلة التسوق</button>
          </section>
        </div>
      )}
    </>
  );
}
