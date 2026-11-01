"use client";

import Image from "next/image";
import {
  createContext,
  useContext,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { submitOrder } from "@/app/actions";
import {
  COMMUNES_BY_WILAYA_CODE,
  DELIVERY_LABELS,
  getCommuneLabelAr,
  getColorLabelAr,
  getProductTitleAr,
  getWilayaLabelAr,
  ORDER_SIZES,
  SHIPPING_FEE,
  WILAYAS,
  type DeliveryType,
  type NewOrder,
  type ProductDto,
  type ShippingRateDto,
} from "@/lib/store-data";

type CartItem = {
  id: number;
  productId: string;
  color: string;
  size: string;
};

type CartContextValue = {
  products: ProductDto[];
  items: CartItem[];
  addItem: (product: ProductDto) => boolean;
  openCart: () => void;
  removeItem: (id: number) => void;
  updateItem: (id: number, color: string, size: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function useStorefrontCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("Storefront cart controls must be rendered inside CartProvider.");
  }
  return context;
}

function getColorOptions(product: ProductDto) {
  const colors = new Map<string, { color: string; colorHex: string; stock: number }>();
  for (const variant of product.variants) {
    const color = colors.get(variant.colorName);
    if (color) {
      color.stock += variant.stock;
    } else {
      colors.set(variant.colorName, {
        color: variant.colorName,
        colorHex: variant.colorHex,
        stock: variant.stock,
      });
    }
  }

  return product.variants.length > 0
    ? [...colors.values()]
    : [{ color: "Standard", colorHex: "#d4d4d8", stock: product.stockQuantity }];
}

function getAvailableSizes(product: ProductDto, color: string) {
  if (product.variants.length === 0) {
    return product.stockQuantity > 0 ? [...ORDER_SIZES] : [];
  }
  return ORDER_SIZES.filter((size) =>
    product.variants.some(
      (variant) => variant.colorName === color && variant.size === size && variant.stock > 0,
    ),
  );
}

function getDefaultSelection(product: ProductDto) {
  if (product.variants.length === 0) {
    return { color: "Standard", size: "Standard" };
  }
  const variant = product.variants.find((candidate) => candidate.stock > 0);
  return variant
    ? { color: variant.colorName, size: variant.size }
    : { color: product.variants[0].colorName, size: product.variants[0].size };
}

function hasSellableStock(product: ProductDto) {
  return product.variants.length > 0
    ? product.variants.some((variant) => variant.stock > 0)
    : product.stockQuantity > 0;
}

function formatPrice(amount: number) {
  return `${new Intl.NumberFormat("ar-DZ").format(amount)} دج`;
}

export function CartProvider({
  products,
  shippingRates,
  children,
}: {
  products: ProductDto[];
  shippingRates: ShippingRateDto[];
  children: ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [nextItemId, setNextItemId] = useState(1);

  function addItem(product: ProductDto) {
    if (items.length >= 10 || !hasSellableStock(product)) return false;
    const selection = getDefaultSelection(product);
    setItems((current) => [
      ...current,
      { id: nextItemId, productId: product.id, ...selection },
    ]);
    setNextItemId((current) => current + 1);
    return true;
  }

  function updateItem(id: number, color: string, size: string) {
    setItems((current) => current.map((item) =>
      item.id === id ? { ...item, color, size } : item,
    ));
  }

  return (
    <CartContext.Provider
      value={{
        products,
        items,
        addItem,
        openCart: () => setIsOpen(true),
        removeItem: (id) => setItems((current) => current.filter((item) => item.id !== id)),
        updateItem,
      }}
    >
      {children}
      {isOpen && (
        <CartDrawer
          shippingRates={shippingRates}
          onClose={() => setIsOpen(false)}
          onClear={() => setItems([])}
        />
      )}
    </CartContext.Provider>
  );
}

export function CartButton() {
  const { items, openCart } = useStorefrontCart();

  return (
    <button
      className="storefront-cart-trigger"
      type="button"
      onClick={openCart}
      aria-label={`السلة، ${items.length} منتجات`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 8H6" />
        <circle cx="10" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </svg>
      <span>السلة</span>
      <span className="storefront-cart-count" aria-live="polite">{items.length}</span>
    </button>
  );
}

export function AddToCartButton({ product }: { product: ProductDto }) {
  const { addItem, items } = useStorefrontCart();
  const [added, setAdded] = useState(false);
  const isDisabled = !hasSellableStock(product) || items.length >= 10;

  return (
    <button
      className="cap-card-cart-button"
      type="button"
      disabled={isDisabled}
      onClick={() => {
        if (addItem(product)) setAdded(true);
      }}
      aria-label={items.length >= 10 ? "وصلت السلة إلى الحد الأقصى" : `أضف ${getProductTitleAr(product.title)} إلى السلة`}
    >
      {added ? (
        <span className="cart-added-mark" aria-hidden="true">✓</span>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 8H6" />
          <circle cx="10" cy="20" r="1" />
          <circle cx="18" cy="20" r="1" />
          <path d="M13 8V2m-3 3h6" />
        </svg>
      )}
      <span>{added ? "أضيفت" : "أضف للسلة"}</span>
    </button>
  );
}

function CartDrawer({
  shippingRates,
  onClose,
  onClear,
}: {
  shippingRates: ShippingRateDto[];
  onClose: () => void;
  onClear: () => void;
}) {
  const { products, items, removeItem, updateItem } = useStorefrontCart();
  const [step, setStep] = useState<"cart" | "checkout" | "success">("cart");
  const [wilayaCode, setWilayaCode] = useState("");
  const [commune, setCommune] = useState("");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("HOME");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderName, setOrderName] = useState("");
  const [orderPhone, setOrderPhone] = useState("");
  const wilaya = wilayaCode ? WILAYAS[Number(wilayaCode) - 1] ?? "" : "";
  const shippingRate = shippingRates.find((rate) => rate.wilaya === wilaya);
  const shippingFee = shippingRate
    ? deliveryType === "HOME" ? shippingRate.homePrice : shippingRate.deskPrice
    : SHIPPING_FEE;
  const subtotal = items.reduce((total, item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return total + (product?.discountedPrice ?? 0);
  }, 0);
  const hasUnavailableItem = items.some((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product) return true;
    if (product.variants.length === 0) return product.stockQuantity < 1;
    return !product.variants.some(
      (variant) =>
        variant.colorName === item.color
        && variant.size === item.size
        && variant.stock > 0,
    );
  });
  const communes = wilayaCode ? COMMUNES_BY_WILAYA_CODE[wilayaCode] ?? [] : [];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const order: NewOrder = {
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      wilaya,
      commune,
      deliveryType,
      offerPack: false,
      items: items.map((item) => {
        const product = products.find((candidate) => candidate.id === item.productId);
        const variant = product?.variants.find(
          (candidate) =>
            candidate.colorName === item.color
            && candidate.size === item.size
            && candidate.stock > 0,
        );
        return {
          productId: item.productId,
          color: item.color,
          size: item.size,
          quantity: 1,
          ...(variant ? { variantId: variant.id } : {}),
        };
      }),
    };

    setIsSubmitting(true);
    try {
      const savedOrder = await submitOrder(order);
      setOrderTotal(savedOrder.totalPrice);
      setOrderName(order.name);
      setOrderPhone(order.phone);
      onClear();
      setStep("success");
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

  return (
    <div
      className="storefront-cart-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="storefront-cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="storefront-cart-title"
        dir="rtl"
      >
        <header className="storefront-cart-header">
          <div>
            <span className="storefront-cart-kicker">
              {step === "checkout" ? "الخطوة الأخيرة" : "HK · SHOP"}
            </span>
            <h2 id="storefront-cart-title">
              {step === "cart" ? "سلة التسوق" : step === "checkout" ? "إتمام الطلب" : "تم استلام طلبكم"}
            </h2>
          </div>
          <button className="storefront-cart-close" type="button" onClick={onClose} aria-label="إغلاق السلة">×</button>
        </header>

        {step === "cart" && (
          <>
            <div className="storefront-cart-content">
              {items.length === 0 ? (
                <div className="storefront-cart-empty">
                  <span aria-hidden="true">＋</span>
                  <h3>سلتكم فارغة حالياً</h3>
                  <p>أضيفوا تصاميمكم المفضلة للبدء.</p>
                  <button type="button" className="storefront-cart-secondary" onClick={onClose}>مواصلة التسوق</button>
                </div>
              ) : (
                <div className="storefront-cart-items">
                  {items.map((item, index) => {
                    const product = products.find((candidate) => candidate.id === item.productId);
                    if (!product) return null;

                    return (
                      <article className="storefront-cart-item" key={item.id}>
                        <div className="storefront-cart-item-image">
                          {product.imageUrls[0]
                            ? <Image src={product.imageUrls[0]} alt="" fill unoptimized sizes="76px" />
                            : <span aria-hidden="true">HK</span>}
                        </div>
                        <div className="storefront-cart-item-main">
                          <div className="storefront-cart-item-heading">
                            <div>
                              <span className="storefront-cart-item-number">قطعة {index + 1}</span>
                              <h3>{getProductTitleAr(product.title)}</h3>
                              <p className="storefront-cart-item-variant">
                                {getColorLabelAr(item.color)} · {item.size}
                              </p>
                            </div>
                            <button
                              className="storefront-cart-remove"
                              type="button"
                              onClick={() => removeItem(item.id)}
                              aria-label={`حذف ${getProductTitleAr(product.title)} من السلة`}
                            >×</button>
                          </div>
                          <strong className="storefront-cart-item-price">{formatPrice(product.discountedPrice)}</strong>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
            {items.length > 0 && (
              <footer className="storefront-cart-footer">
                <div className="storefront-cart-subtotal">
                  <span>المجموع الفرعي · {items.length} قطع</span>
                  <strong>{formatPrice(subtotal)}</strong>
                </div>
                <p>تُحسب رسوم التوصيل بعد اختيار الولاية.</p>
                <button className="storefront-cart-primary" type="button" onClick={() => setStep("checkout")}>
                  المتابعة إلى إتمام الطلب <span aria-hidden="true">←</span>
                </button>
              </footer>
            )}
          </>
        )}

        {step === "checkout" && (
          <form className="storefront-checkout-form" onSubmit={handleSubmit}>
            <button className="storefront-cart-back" type="button" onClick={() => setStep("cart")}>→ العودة إلى السلة</button>
            <section className="storefront-checkout-customizations" aria-labelledby="storefront-checkout-items-title">
              <h3 id="storefront-checkout-items-title">خصصوا كل قطعة</h3>
              {items.map((item, index) => {
                const product = products.find((candidate) => candidate.id === item.productId);
                if (!product) return null;
                const colorOptions = getColorOptions(product);
                const availableSizes = getAvailableSizes(product, item.color);

                return (
                  <article className="storefront-checkout-item" key={item.id}>
                    <div className="storefront-checkout-item-heading">
                      <div>
                        <span>قطعة {index + 1}</span>
                        <strong>{getProductTitleAr(product.title)}</strong>
                      </div>
                      <strong>{formatPrice(product.discountedPrice)}</strong>
                    </div>
                    <div className="storefront-cart-choice">
                      <span>اللون</span>
                      <div className="storefront-cart-colors" role="group" aria-label={`لون القطعة ${index + 1}`}>
                        {colorOptions.map((option) => (
                          <button
                            className={`storefront-cart-color${item.color === option.color ? " is-selected" : ""}`}
                            key={option.color}
                            type="button"
                            onClick={() => updateItem(item.id, option.color, getAvailableSizes(product, option.color)[0] ?? "Standard")}
                            disabled={option.stock < 1}
                            aria-label={getColorLabelAr(option.color)}
                            aria-pressed={item.color === option.color}
                          >
                            <span style={{ backgroundColor: option.colorHex }} />
                          </button>
                        ))}
                      </div>
                      <span className="storefront-cart-selected-color">{getColorLabelAr(item.color)}</span>
                    </div>
                    <div className="storefront-cart-choice">
                      <span>المقاس</span>
                      <div className="storefront-cart-sizes" role="group" aria-label={`مقاس القطعة ${index + 1}`}>
                        {ORDER_SIZES.map((size) => {
                          const isAvailable = availableSizes.includes(size);
                          return (
                            <button
                              className={item.size === size && isAvailable ? "is-selected" : ""}
                              key={size}
                              type="button"
                              disabled={!isAvailable}
                              aria-pressed={item.size === size && isAvailable}
                              onClick={() => updateItem(item.id, item.color, size)}
                            >{size}</button>
                          );
                        })}
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
            <div className="storefront-checkout-items">
              <span>{items.length} قطع في الطلب</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <label>
              <span>الاسم الكامل</span>
              <input name="name" autoComplete="name" minLength={3} required placeholder="مثال: أمين بن علي" />
            </label>
            <label>
              <span>رقم الهاتف</span>
              <input
                name="phone"
                type="tel"
                autoComplete="tel-national"
                inputMode="numeric"
                pattern="(0[5-7][0-9]{8}|[5-7][0-9]{8})"
                title="أدخلوا رقم هاتف جزائرياً صالحاً (مثال: 0550123456)"
                required
                dir="ltr"
                placeholder="0550 12 34 56"
              />
            </label>
            <div className="storefront-checkout-fields">
              <label>
                <span>الولاية</span>
                <select
                  value={wilayaCode}
                  onChange={(event) => {
                    setWilayaCode(event.currentTarget.value);
                    setCommune("");
                  }}
                  required
                >
                  <option value="" disabled>اختاروا الولاية</option>
                  {WILAYAS.map((name, index) => (
                    <option value={String(index + 1)} key={name}>
                      {String(index + 1).padStart(2, "0")} — {getWilayaLabelAr(name)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>البلدية</span>
                <select
                  value={commune}
                  onChange={(event) => setCommune(event.currentTarget.value)}
                  disabled={!wilayaCode || communes.length === 0}
                  required
                >
                  <option value="" disabled>{communes.length > 0 ? "اختاروا البلدية" : "اختاروا الولاية أولاً"}</option>
                  {communes.map((name) => <option value={name} key={name}>{getCommuneLabelAr(name, wilaya)}</option>)}
                </select>
              </label>
            </div>
            <label>
              <span>طريقة التوصيل</span>
              <select value={deliveryType} onChange={(event) => setDeliveryType(event.currentTarget.value === "DESK" ? "DESK" : "HOME")}>
                <option value="HOME">إلى المنزل</option>
                <option value="DESK">إلى المكتب</option>
              </select>
            </label>
            <div className="storefront-checkout-total" aria-live="polite">
              <span>المجموع الفرعي</span><strong>{formatPrice(subtotal)}</strong>
              <span>التوصيل · {DELIVERY_LABELS[deliveryType]}</span>
              <strong>{shippingRate ? formatPrice(shippingFee) : "اختاروا الولاية"}</strong>
              <span>المبلغ الإجمالي</span>
              <strong>{formatPrice(subtotal + (shippingRate ? shippingFee : 0))}</strong>
            </div>
            {error && <p className="storefront-checkout-error" role="alert">{error}</p>}
            {hasUnavailableItem && (
              <p className="storefront-checkout-error" role="alert">
                أحد الخيارات المحددة لم يعد متوفراً. عدّلوا اللون أو المقاس قبل إتمام الطلب.
              </p>
            )}
            <button className="storefront-cart-primary" type="submit" disabled={isSubmitting || !shippingRate || items.length === 0 || hasUnavailableItem}>
              {isSubmitting ? "جارٍ تسجيل الطلب…" : "تأكيد الطلب · الدفع عند الاستلام"}
            </button>
            <p className="storefront-checkout-note">الدفع عند الاستلام · التوصيل إلى الولايات الـ58</p>
          </form>
        )}

        {step === "success" && (
          <div className="storefront-cart-success">
            <span className="storefront-success-mark" aria-hidden="true">✓</span>
            <p>شكراً لثقتكم يا {orderName.split(" ")[0]}.</p>
            <h3>تم استلام طلبكم بنجاح</h3>
            <p>سنتصل بكم على الرقم <strong dir="ltr">{orderPhone}</strong> لتأكيد التوصيل.</p>
            <div><span>المبلغ عند الاستلام</span><strong>{formatPrice(orderTotal)}</strong></div>
            <button className="storefront-cart-primary" type="button" onClick={onClose}>مواصلة التسوق</button>
          </div>
        )}
      </aside>
    </div>
  );
}
