
"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
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

  function getColorStock(color: string) {
    if (product.variants.length === 0) return product.stockQuantity;
    return product.variants
      .filter((variant) => variant.colorName === color)
      .reduce((stock, variant) => stock + variant.stock, 0);
  }

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
      trackPurchase(
        savedOrder.id,
        savedOrder.totalPrice,
        savedOrder.items.flatMap((item) => item.productId ? [item.productId] : []),
      );
      setOrder({
        name: nextOrder.name,
        phone: formPhone,
        wilaya,
        commune: nextOrder.commune,
        deliveryType,
        shippingFee: savedOrder.shippingFee,
        totalPrice: savedOrder.totalPrice,
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
        onFocusCapture={() => {
          if (checkoutTracked.current) return;
          checkoutTracked.current = true;
          trackInitiateCheckout(packSubtotal, packItems.map(() => product.id));
        }}
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
              <div><span>التوصيل</span><strong>{DELIVERY_LABELS[order.deliveryType]} · {getCommuneLabelAr(order.commune, order.wilaya)}، {getWilayaLabelAr(order.wilaya)}</strong></div>
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
