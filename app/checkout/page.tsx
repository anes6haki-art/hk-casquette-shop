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
        <Link className="shop-brand" href="/" aria-label="متجر إتش كيه للقبعات، الصفحة الرئيسية">
          <span className="shop-brand-mark">HK</span><span>Hk casquette shop</span>
        </Link>
        <div className="shop-header-actions"><CartButton /></div>
      </header>
      <section className="checkout-main">
        <div className="checkout-heading">
          <span className="shop-eyebrow"><span /> إتمام الطلب</span>
          <h1>طلبكم<span>.</span></h1>
          <p>راجعوا محتويات السلة وأدخلوا بيانات التوصيل.</p>
        </div>
        <CartCheckoutForm shippingRates={shippingRates} />
      </section>
      <footer className="shop-footer">
        <Link className="shop-brand" href="/"><span className="shop-brand-mark">HK</span><span>Hk casquette shop</span></Link>
        <p>أناقتكم في كل مكان في الجزائر.</p>
        <Link href="/">مواصلة التسوق</Link>
      </footer>
    </main>
  );
}
