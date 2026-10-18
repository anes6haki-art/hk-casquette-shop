"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { submitOrder } from "@/app/actions";
import {
  COMMUNES_BY_WILAYA_CODE as communesByWilaya,
  getColorLabelAr,
  getProductTitleAr,
  getWilayaLabelAr,
  ORDER_SIZE_LABELS_AR,
  ORDER_SIZES,
  WILAYAS,
  type DeliveryType,
} from "@/lib/store-data";
import { useCart } from "./cart-context";

function formatPrice(amount: number) {
  return `${new Intl.NumberFormat("ar-DZ").format(amount)} دج`;
}

export default function CartCheckoutForm({
  shippingRates,
}: {
  shippingRates: { wilaya: string; homePrice: number; deskPrice: number }[];
}) {
  const { items, subtotal, clearCart, updateQuantity, removeItem, itemCount } = useCart();
  const [wilayaCode, setWilayaCode] = useState("");
  const [commune, setCommune] = useState("");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("HOME");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const wilaya = wilayaCode ? WILAYAS[Number(wilayaCode) - 1] ?? "" : "";
  const availableCommunes = wilayaCode ? communesByWilaya[wilayaCode] ?? [] : [];
  const shippingRate = shippingRates.find((rate) => rate.wilaya === wilaya);
  const shippingFee = shippingRate
    ? deliveryType === "HOME" ? shippingRate.homePrice : shippingRate.deskPrice
    : 0;

  function handleWilayaChange(event: ChangeEvent<HTMLSelectElement>) {
    setWilayaCode(event.currentTarget.value);
    setCommune("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (items.length === 0) {
      setError("سلتكم فارغة.");
      return;
    }
    const formData = new FormData(event.currentTarget);
    setError(null);
    setIsSubmitting(true);
    try {
      await submitOrder({
        name: String(formData.get("name") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        wilaya,
        commune,
        deliveryType,
        items: items.map((item) => ({
          productId: item.productId,
          ...(item.variantId ? { variantId: item.variantId } : {}),
          color: item.selectedColor,
          size: item.selectedSize,
          quantity: item.quantity,
        })),
      });
      clearCart();
      setComplete(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "تعذر تسجيل الطلب. تحققوا من المعلومات وحاولوا مجدداً.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (complete) {
    return (
      <section className="checkout-complete" role="status">
        <span aria-hidden="true">✓</span>
        <h2>تم تسجيل طلبكم</h2>
        <p>شكراً لطلبكم. سيتصل بكم فريقنا لتأكيد التوصيل.</p>
        <Link href="/">العودة إلى المتجر</Link>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="checkout-empty">
        <h2>سلتكم فارغة</h2>
        <p>اختاروا قبعة لإعداد طلبكم.</p>
        <Link href="/">اكتشفوا المجموعة</Link>
      </section>
    );
  }

  return (
    <form className="checkout-layout" onSubmit={handleSubmit}>
      <section className="checkout-cart-summary" aria-labelledby="checkout-summary-title">
        <h2 id="checkout-summary-title">محتويات السلة</h2>
        {items.map((item) => (
          <article className="checkout-cart-item" key={item.id}>
            {item.image
              ? <Image src={item.image} alt="" width={76} height={76} unoptimized />
              : <span className="cart-item-image-fallback" aria-hidden="true">HK</span>}
            <div>
              <strong>{getProductTitleAr(item.title)}</strong>
              <span>{getColorLabelAr(item.selectedColor)} · {ORDER_SIZE_LABELS_AR[item.selectedSize as keyof typeof ORDER_SIZE_LABELS_AR] ?? item.selectedSize} · الكمية {item.quantity}</span>
              <b>{formatPrice(item.price * item.quantity)}</b>
              <div className="cart-item-options">
                {item.variants && item.variants.length > 0 ? (
                  <label>
                    <span className="sr-only">اللون</span>
                    <select value={item.variantId ?? ""} onChange={(event) => updateVariant(item.id, event.currentTarget.value)}>
                      {item.variants.map((variant) => <option key={variant.variantId} value={variant.variantId}>{getColorLabelAr(variant.color)}</option>)}
                    </select>
                  </label>
                ) : <span>{getColorLabelAr(item.selectedColor)}</span>}
                <label>
                  <span className="sr-only">المقاس</span>
                  <select value={item.selectedSize} onChange={(event) => updateSize(item.id, event.currentTarget.value)}>
                    {ORDER_SIZES.map((size) => <option key={size} value={size}>{ORDER_SIZE_LABELS_AR[size]}</option>)}
                  </select>
                </label>
              </div>
              <div className="cart-drawer-item-actions">
                <div className="cart-quantity-control">
                  <button
                    type="button"
                    aria-label={`تقليل كمية ${getProductTitleAr(item.title)}`}
                    disabled={item.quantity <= 1}
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    aria-label={`زيادة كمية ${getProductTitleAr(item.title)}`}
                    disabled={itemCount >= 10}
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <button
                  className="cart-remove-button"
                  type="button"
                  onClick={() => removeItem(item.id)}
                >
                  حذف
                </button>
              </div>
            </div>
          </article>
        ))}
        <div className="checkout-total-line"><span>المجموع الفرعي</span><strong>{formatPrice(subtotal)}</strong></div>
        <div className="checkout-total-line"><span>التوصيل</span><strong>{shippingRate ? formatPrice(shippingFee) : "اختاروا الولاية"}</strong></div>
        <div className="checkout-total-line checkout-total-final"><span>المبلغ الإجمالي</span><strong>{formatPrice(subtotal + shippingFee)}</strong></div>
      </section>

      <section className="checkout-details-form" aria-labelledby="checkout-delivery-title">
        <span className="shop-eyebrow"><span /> الدفع عند الاستلام</span>
        <h2 id="checkout-delivery-title">أين نرسل طلبكم؟</h2>
        <label className="field">
          <span>الاسم الكامل</span>
          <input name="name" type="text" placeholder="مثال: أمين بن علي" autoComplete="name" required minLength={3} />
        </label>
        <label className="field">
          <span>رقم الهاتف</span>
          <div className="phone-input">
            <span aria-hidden="true">🇩🇿 +213</span>
            <input name="phone" type="tel" placeholder="550 12 34 56" autoComplete="tel-national" inputMode="tel" pattern="(0[5-7][0-9]{8}|[5-7][0-9]{8})" required dir="ltr" />
          </div>
        </label>
        <div className="field-pair">
          <label className="field">
            <span>الولاية</span>
            <select name="wilaya" value={wilayaCode} onChange={handleWilayaChange} required>
              <option value="" disabled>اختاروا الولاية</option>
              {WILAYAS.map((name, index) => (
                <option key={name} value={String(index + 1)}>{String(index + 1).padStart(2, "0")} — {getWilayaLabelAr(name)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>البلدية</span>
            <select name="commune" value={commune} onChange={(event) => setCommune(event.currentTarget.value)} required disabled={!wilayaCode}>
              <option value="" disabled>اختاروا البلدية</option>
              {availableCommunes.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
        </div>
        <label className="field">
          <span>طريقة التوصيل</span>
          <select value={deliveryType} onChange={(event) => setDeliveryType(event.currentTarget.value === "DESK" ? "DESK" : "HOME")}>
            <option value="HOME">إلى المنزل</option>
            <option value="DESK">إلى المكتب</option>
          </select>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="submit-button" type="submit" disabled={isSubmitting || !shippingRate}>
          {isSubmitting ? "جارٍ تسجيل الطلب…" : "تأكيد الطلب"} <span aria-hidden="true">←</span>
        </button>
        <p className="form-note"><span aria-hidden="true">✓</span> لا يوجد دفع إلكتروني. الدفع عند الاستلام.</p>
      </section>
    </form>
  );
}
