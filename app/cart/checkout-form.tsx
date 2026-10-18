"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { submitOrder } from "@/app/actions";
import { COMMUNES_BY_WILAYA_CODE as communesByWilaya, WILAYAS, type DeliveryType } from "@/lib/store-data";
import { useCart } from "./cart-context";

function formatPrice(amount: number) {
  return `${new Intl.NumberFormat("fr-DZ").format(amount)} DA`;
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
      setError("Votre panier est vide.");
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
          : "La commande n’a pas pu être enregistrée. Vérifiez vos informations et réessayez.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (complete) {
    return (
      <section className="checkout-complete" role="status">
        <span aria-hidden="true">✓</span>
        <h2>Commande enregistrée</h2>
        <p>Merci pour votre commande. Notre équipe vous appellera pour confirmer la livraison.</p>
        <Link href="/">Retour à la boutique</Link>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="checkout-empty">
        <h2>Votre panier est vide</h2>
        <p>Choisissez une casquette pour préparer votre commande.</p>
        <Link href="/">Découvrir la collection</Link>
      </section>
    );
  }

  return (
    <form className="checkout-layout" onSubmit={handleSubmit}>
      <section className="checkout-cart-summary" aria-labelledby="checkout-summary-title">
        <h2 id="checkout-summary-title">Votre sélection</h2>
        {items.map((item) => (
          <article className="checkout-cart-item" key={item.id}>
            {item.image
              ? <Image src={item.image} alt="" width={76} height={76} unoptimized />
              : <span className="cart-item-image-fallback" aria-hidden="true">HK</span>}
            <div>
              <strong>{item.title}</strong>
              <span>{item.selectedColor} · {item.selectedSize} · Qté {item.quantity}</span>
              <b>{formatPrice(item.price * item.quantity)}</b>
              <div className="cart-drawer-item-actions">
                <div className="cart-quantity-control">
                  <button
                    type="button"
                    aria-label={`Diminuer la quantité de ${item.title}`}
                    disabled={item.quantity <= 1}
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Augmenter la quantité de ${item.title}`}
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
                  Supprimer
                </button>
              </div>
            </div>
          </article>
        ))}
        <div className="checkout-total-line"><span>Sous-total</span><strong>{formatPrice(subtotal)}</strong></div>
        <div className="checkout-total-line"><span>Livraison</span><strong>{shippingRate ? formatPrice(shippingFee) : "Choisissez une wilaya"}</strong></div>
        <div className="checkout-total-line checkout-total-final"><span>Total à payer</span><strong>{formatPrice(subtotal + shippingFee)}</strong></div>
      </section>

      <section className="checkout-details-form" aria-labelledby="checkout-delivery-title">
        <span className="shop-eyebrow"><span /> PAIEMENT À LA LIVRAISON</span>
        <h2 id="checkout-delivery-title">Où livrer votre commande ?</h2>
        <label className="field">
          <span>Nom et prénom</span>
          <input name="name" type="text" placeholder="Ex. Amine Benali" autoComplete="name" required minLength={3} />
        </label>
        <label className="field">
          <span>Numéro de téléphone</span>
          <div className="phone-input">
            <span aria-hidden="true">🇩🇿 +213</span>
            <input name="phone" type="tel" placeholder="550 12 34 56" autoComplete="tel-national" inputMode="tel" pattern="(0[5-7][0-9]{8}|[5-7][0-9]{8})" required />
          </div>
        </label>
        <div className="field-pair">
          <label className="field">
            <span>الولاية / Wilaya</span>
            <select name="wilaya" value={wilayaCode} onChange={handleWilayaChange} required>
              <option value="" disabled>Choisir une wilaya / اختر الولاية</option>
              {WILAYAS.map((name, index) => (
                <option key={name} value={String(index + 1)}>{String(index + 1).padStart(2, "0")} — {name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>البلدية / Commune</span>
            <select name="commune" value={commune} onChange={(event) => setCommune(event.currentTarget.value)} required disabled={!wilayaCode}>
              <option value="" disabled>Choisir une commune</option>
              {availableCommunes.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Mode de livraison</span>
          <select value={deliveryType} onChange={(event) => setDeliveryType(event.currentTarget.value === "DESK" ? "DESK" : "HOME")}>
            <option value="HOME">À domicile</option>
            <option value="DESK">Stop Desk / Bureau</option>
          </select>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="submit-button" type="submit" disabled={isSubmitting || !shippingRate}>
          {isSubmitting ? "Enregistrement…" : "Confirmer la commande"} <span aria-hidden="true">→</span>
        </button>
        <p className="form-note"><span aria-hidden="true">✓</span> Aucun paiement en ligne. Vous payez à la livraison.</p>
      </section>
    </form>
  );
}
