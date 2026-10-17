import Link from "next/link";
import { connection } from "next/server";
import { CartButton } from "@/app/cart/cart-context";
import CartCheckoutForm from "@/app/cart/checkout-form";
import { getShippingRatesForCheckout } from "@/lib/orders";

export const instant = false;

export default async function CheckoutPage() {
  await connection();
  const shippingRates = await getShippingRatesForCheckout();

  return (
    <main className="shop-home checkout-page">
      <header className="shop-header">
        <Link className="shop-brand" href="/" aria-label="Hk casquette shop, accueil">
          <span className="shop-brand-mark">HK</span><span>Hk casquette shop</span>
        </Link>
        <div className="shop-header-actions"><CartButton /></div>
      </header>
      <section className="checkout-main">
        <div className="checkout-heading">
          <span className="shop-eyebrow"><span /> FINALISER VOTRE SÉLECTION</span>
          <h1>Votre commande<span>.</span></h1>
          <p>Vérifiez les articles et indiquez vos coordonnées de livraison.</p>
        </div>
        <CartCheckoutForm shippingRates={shippingRates} />
      </section>
      <footer className="shop-footer">
        <Link className="shop-brand" href="/"><span className="shop-brand-mark">HK</span><span>Hk casquette shop</span></Link>
        <p>Votre style, partout en Algérie.</p>
        <Link href="/">Continuer mes achats</Link>
      </footer>
    </main>
  );
}
