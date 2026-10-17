import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import OrderForm from "@/app/order-form";
import { CartButton } from "@/app/cart/cart-context";
import { getStorefrontProduct } from "@/lib/products";
import { getShippingRatesForCheckout } from "@/lib/orders";
import ProductGallery from "./product-gallery";

export const instant = false;

function formatPrice(amount: number) {
  return `${new Intl.NumberFormat("fr-DZ").format(amount)} DA`;
}

export default async function ProductPage({ params }: PageProps<"/products/[id]">) {
  await connection();
  const { id } = await params;
  const [product, shippingRates] = await Promise.all([
    getStorefrontProduct(id),
    getShippingRatesForCheckout(),
  ]);
  if (!product) notFound();

  const discount = product.originalPrice > product.discountedPrice
    ? Math.round((1 - product.discountedPrice / product.originalPrice) * 100)
    : 0;

  return (
    <main className="product-page">
      <header className="shop-header product-header">
        <Link className="shop-brand" href="/" aria-label="Hk casquette shop, accueil">
          <span className="shop-brand-mark">HK</span><span>Hk casquette shop</span>
        </Link>
        <div className="product-header-actions">
          <CartButton />
          <Link className="product-back-link" href="/"><span aria-hidden="true">←</span> Retour à la collection</Link>
        </div>
      </header>
      <nav className="product-breadcrumb" aria-label="Fil d’Ariane">
        <Link href="/">Accueil</Link><span>/</span><span>{product.title}</span>
      </nav>

      <section className="product-detail">
        <ProductGallery
          title={product.title}
          productId={product.id}
          price={product.discountedPrice}
          stockQuantity={product.stockQuantity}
          imageUrls={product.imageUrls}
          variants={product.variants}
        />
        <div className="product-detail-copy">
          <span className="shop-eyebrow"><span /> HK CASQUETTE SHOP · COLLECTION</span>
          <h1>{product.title}</h1>
          <div className="product-detail-price">
            <strong>{formatPrice(product.discountedPrice)}</strong>
            {product.originalPrice > product.discountedPrice && <del>{formatPrice(product.originalPrice)}</del>}
            {discount > 0 && <span className="product-discount">-{discount}%</span>}
          </div>
          <p className="product-stock"><span className={product.stockQuantity > 0 ? "stock-dot" : "stock-dot is-empty"} />{product.stockQuantity > 0 ? `${product.stockQuantity} disponible(s) en stock` : "Actuellement épuisée"}</p>
          <p className="product-full-description">{product.description}</p>
          <div className="product-delivery-points">
            <span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h11v10H3zM14 10h4l3 3v4h-7zM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg>
              Livraison dans les 58 wilayas
            </span>
            <span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4zM8 10h8M8 14h4" /><path d="m16 15 1.5 1.5L20 14" /></svg>
              Paiement à la livraison
            </span>
          </div>
          <a className="shop-primary-cta product-buy-cta" href="#commander" aria-disabled={product.stockQuantity < 1}>
            أطلب الآن <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>

      <section className="product-order-section" id="commander">
        <div className="product-order-copy">
          <span className="shop-eyebrow"><span /> COMMANDE SANS PAIEMENT EN LIGNE</span>
          <h2>Réservez votre<br /><em>casquette.</em></h2>
          <p>Remplissez vos coordonnées. Nous vous appellerons pour confirmer votre commande avant l’expédition.</p>
          <div className="product-order-total"><span>{product.title}</span><strong>{formatPrice(product.discountedPrice)}</strong></div>
          <small>Le montant de la livraison dépend de votre wilaya et du mode choisi.</small>
        </div>
        <OrderForm product={product} shippingRates={shippingRates} />
      </section>

      <footer className="shop-footer">
        <Link className="shop-brand" href="/"><span className="shop-brand-mark">HK</span><span>Hk casquette shop</span></Link>
        <p>Votre style, partout en Algérie.</p>
        <Link href="/admin">Espace admin</Link>
      </footer>
    </main>
  );
}
