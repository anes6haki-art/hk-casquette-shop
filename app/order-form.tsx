"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
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

type CartLine = {
  key: number;
  variantId?: string;
  color: string;
  size: string;
  quantity: number;
};

type OrderConfirmation = {
  name: string;
  phone: string;
  wilaya: string;
  commune: string;
  deliveryType: DeliveryType;
  shippingFee: number;
  totalPrice: number;
  items: { color: string; size: string; quantity: number; unitPrice: number }[];
};

export default function OrderForm({
  product,
  shippingRates,
}: {
  product: ProductDto;
  shippingRates: ShippingRateDto[];
}) {
  const availableColors = product.variants.length > 0
    ? product.variants.map((variant) => ({
      id: variant.id,
      name: variant.colorName,
      hex: variant.colorHex,
    }))
    : [{ id: undefined, name: "Standard", hex: "#27272a" }];
  const [items, setItems] = useState<CartLine[]>([{
    key: 0,
    variantId: availableColors[0].id,
    color: availableColors[0].name,
    size: AVAILABLE_SIZES[0],
    quantity: 1,
  }]);
  const nextLineKey = useRef(1);
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
  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = product.discountedPrice * totalQuantity;
  const total = subtotal + shippingFee;
  const maxQuantity = Math.min(10, product.stockQuantity);
  const availableCommunes = selectedWilayaCode ? communesData[selectedWilayaCode] || [] : [];

  function handleWilayaChange(event: ChangeEvent<HTMLSelectElement>) {
    const code = normalizeWilayaCode(event.currentTarget.value);
    setSelectedWilayaCode(code ? String(code) : "");
    setCommune("");
    setSubmissionError(null);
  }

  function updateItem(key: number, changes: Partial<CartLine>) {
    setItems((current) => current.map((item) => item.key === key ? { ...item, ...changes } : item));
  }

  function addItem() {
    if (items.length >= 10 || totalQuantity >= maxQuantity) return;
    const firstColor = availableColors[0];
    setItems((current) => [...current, {
      key: nextLineKey.current++,
      variantId: firstColor.id,
      color: firstColor.name,
      size: AVAILABLE_SIZES[0],
      quantity: 1,
    }]);
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
      items: items.map(({ variantId, color, size, quantity }) => ({
        productId: product.id,
        ...(variantId ? { variantId } : {}),
        color,
        size,
        quantity,
      })),
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
        items: items.map((item) => ({
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          unitPrice: product.discountedPrice,
        })),
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
      <form className="order-card" onSubmit={handleSubmit}>
        <div className="form-heading">
          <div>
            <span className="form-step">طلبكم</span>
            <h3>اطلبوا {getProductTitleAr(product.title)}.</h3>
          </div>
          <span className="form-lock" aria-label="نموذج آمن">✳</span>
        </div>

        <div className="order-item-list">
          {items.map((item, index) => (
            <fieldset className="order-item-option" key={item.key}>
              <legend>القبعة {index + 1}</legend>
              {product.variants.length > 0 ? (
                <div className="order-option-group">
                  <span>اللون</span>
                  <div className="order-color-options">
                    {availableColors.map((color) => (
                      <button
                        className={`order-color-option${item.variantId === color.id ? " is-selected" : ""}`}
                        key={color.id}
                        type="button"
                        onClick={() => updateItem(item.key, { variantId: color.id, color: color.name })}
                        aria-label={getColorLabelAr(color.name)}
                        aria-pressed={item.variantId === color.id}
                      >
                        <span className="order-color-swatch" style={{ backgroundColor: color.hex }} />
                        <span>{getColorLabelAr(color.name)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="order-item-default-color">
                  <span className="order-color-swatch" style={{ backgroundColor: availableColors[0].hex }} />
                  {getColorLabelAr(availableColors[0].name)}
                </p>
              )}
              <div className="order-option-group">
                <span>المقاس</span>
                <div className="order-size-options">
                  {AVAILABLE_SIZES.map((size) => (
                    <button
                      className={`order-size-option${item.size === size ? " is-selected" : ""}`}
                      key={size}
                      type="button"
                      onClick={() => updateItem(item.key, { size })}
                      aria-pressed={item.size === size}
                    >
                      {ORDER_SIZE_LABELS_AR[size]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="order-item-actions">
                <div className="quantity-control" aria-label={`الكمية للون ${getColorLabelAr(item.color)} والمقاس ${ORDER_SIZE_LABELS_AR[item.size]}`}>
                  <button
                    type="button"
                    onClick={() => updateItem(item.key, { quantity: item.quantity - 1 })}
                    aria-label="تقليل الكمية"
                    disabled={item.quantity <= 1}
                  >−</button>
                  <output aria-live="polite">{item.quantity}</output>
                  <button
                    type="button"
                    onClick={() => updateItem(item.key, { quantity: item.quantity + 1 })}
                    aria-label="زيادة الكمية"
                    disabled={totalQuantity >= maxQuantity}
                  >+</button>
                </div>
                {items.length > 1 && (
                  <button
                    className="order-item-remove"
                    type="button"
                    onClick={() => setItems((current) => current.filter((line) => line.key !== item.key))}
                  >
                    حذف
                  </button>
                )}
              </div>
            </fieldset>
          ))}
          <button
            className="order-add-item"
            type="button"
            onClick={addItem}
            disabled={items.length >= 10 || totalQuantity >= maxQuantity}
          >
            + إضافة لون / مقاس آخر
          </button>
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
              placeholder="550 12 34 56"
              autoComplete="tel-national"
              inputMode="tel"
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
          {items.map((item) => (
            <div className="order-line-summary" key={item.key}>
              <span>{item.quantity} × {getProductTitleAr(product.title)} · {getColorLabelAr(item.color)} · {ORDER_SIZE_LABELS_AR[item.size]}</span>
              <span>{formatPrice(product.discountedPrice * item.quantity)}</span>
            </div>
          ))}
          <div>
            <span>Livraison · {DELIVERY_LABELS[deliveryType]}</span>
            <span>{formatPrice(shippingFee)}</span>
          </div>
          <div className="price-total"><strong>المبلغ الإجمالي</strong><strong>{formatPrice(total)}</strong></div>
        </div>

        {submissionError && <p className="form-error" role="alert">{submissionError}</p>}
        <button
          className="submit-button"
          type="submit"
          disabled={isSubmitting || !selectedShippingRate || product.stockQuantity < 1 || totalQuantity > product.stockQuantity}
        >
          {product.stockQuantity < 1 ? "نفدت الكمية" : isSubmitting ? "جارٍ تسجيل الطلب…" : "تأكيد الطلب"} <span aria-hidden="true">←</span>
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
                {order.items.map((item, index) => (
                  <strong key={`${item.color}-${item.size}-${index}`}>
                    {item.quantity} × {getProductTitleAr(product.title)} · {getColorLabelAr(item.color)} · {ORDER_SIZE_LABELS_AR[item.size]}
                  </strong>
                ))}
              </div>
              <div><span>التوصيل</span><strong>{DELIVERY_LABELS[order.deliveryType]} · {order.commune}, {getWilayaLabelAr(order.wilaya)}</strong></div>
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
