import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { getStorefrontProducts } from "@/lib/products";
import { CartButton } from "./cart/cart-context";

export const instant = false;

function formatPrice(amount: number) {
  return `${new Intl.NumberFormat("fr-DZ").format(amount)} DA`;
}

function CapIllustration() {
  return (
    <svg className="cap-illustration" viewBox="0 0 240 180" role="img" aria-label="Illustration casquette">
      <path d="M47 103c4-44 29-68 71-68s67 24 71 68l3 18H45l2-18Z" />
      <path d="M46 111c-25 6-38 22-31 35 8 16 58 22 105 15 23-3 40-9 55-18-20 4-44 2-66-4-25-7-43-19-63-28Z" />
      <path d="M118 42v48m-51 2c15-12 33-18 53-18 20 0 38 6 54 18" />
    </svg>
  );
}

export default async function Home() {
  await connection();
  const products = await getStorefrontProducts();

  return (
    <main className="shop-home">
      <header className="shop-header">
        <Link className="shop-brand" href="/" aria-label="Hk casquette shop, accueil">
          <span className="shop-brand-mark">HK</span>
          <span>Hk casquette shop</span>
        </Link>
        <nav className="shop-nav" aria-label="Navigation principale">
          <a href="#catalogue">La collection</a>
          <a href="#engagements">Livraison & paiement</a>
        </nav>
        <div className="shop-header-actions">
          <CartButton />
          <Link className="shop-header-cta" href="#catalogue">Voir les casquettes <span>↗</span></Link>
        </div>
      </header>

      <section className="shop-hero">
        <div className="shop-hero-copy">
          <span className="shop-eyebrow"><span /> CASQUETTES · STYLE · ALGÉRIE</span>
          <h1>Le détail qui<br /><em>fait le style.</em></h1>
          <p>Des casquettes choisies pour vous accompagner partout. Trouvez votre modèle et commandez simplement, avec paiement à la livraison.</p>
          <Link className="shop-primary-cta" href="#catalogue">Découvrir la collection <span>↓</span></Link>
          <div className="shop-hero-trust"><span>✳ Livraison 58 wilayas</span><span>✳ Paiement à la réception</span></div>
        </div>
        <div className="shop-hero-art">
          <div className="shop-hero-stamp">HK<br /><small>CASQUETTE SHOP</small></div>
          <div className="shop-hero-product">
            <Image
              src="/images/blue-baseball-cap.jpg"
              alt="Casquette bleu marine, photographie produit"
              fill
              priority
              unoptimized
              sizes="(max-width: 760px) 90vw, 48vw"
            />
          </div>
          <span className="shop-hero-caption">La pièce signature · Bleu marine</span>
        </div>
      </section>

      <section className="shop-trust-strip" id="engagements">
        <span>Livraison dans les 58 wilayas</span><i />
        <span>Paiement sécurisé à la réception</span><i />
        <span>Commandez en quelques clics</span>
      </section>

      <section className="catalog-section" id="catalogue">
        <div className="catalog-heading">
          <div><span className="shop-eyebrow">LA COLLECTION HK</span><h2>Choisissez votre style<span>.</span></h2></div>
          <p>{products.length} modèle{products.length === 1 ? "" : "s"} à découvrir</p>
        </div>
        {products.length === 0 ? (
          <div className="catalog-empty">
            <div className="catalog-empty-art"><CapIllustration /></div>
            <h3>La collection arrive bientôt.</h3>
            <p>Nos casquettes seront bientôt disponibles. Revenez nous voir prochainement.</p>
          </div>
        ) : (
          <div className="cap-grid">
            {products.map((product) => (
              <article className="cap-card" key={product.id}>
                <Link className="cap-card-image" href={`/products/${product.id}`} aria-label={`Voir ${product.title}`}>
                  {product.imageUrls[0]
                    ? <Image src={product.imageUrls[0]} alt={product.title} fill unoptimized sizes="(max-width: 560px) 90vw, (max-width: 900px) 44vw, 30vw" />
                    : <CapIllustration />}
                  {product.originalPrice > product.discountedPrice && (
                    <span className="cap-discount">-{Math.round((1 - product.discountedPrice / product.originalPrice) * 100)}%</span>
                  )}
                  {product.stockQuantity < 1 && <span className="cap-sold-out">Épuisé</span>}
                </Link>
                <div className="cap-card-info">
                  <div className="cap-card-title-row"><h3>{product.title}</h3><span>{product.stockQuantity > 0 ? "En stock" : "Épuisé"}</span></div>
                  <div className="cap-card-bottom">
                    <div className="cap-card-price"><strong>{formatPrice(product.discountedPrice)}</strong>{product.originalPrice > product.discountedPrice && <del>{formatPrice(product.originalPrice)}</del>}</div>
                    <Link className="cap-buy-button" href={`/products/${product.id}`} aria-disabled={product.stockQuantity < 1}>
                      أطلب الآن <span>→</span>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="shop-footer">
        <Link className="shop-brand" href="/"><span className="shop-brand-mark">HK</span><span>Hk casquette shop</span></Link>
        <p>Votre style, partout en Algérie.</p>
        <Link href="/admin">Espace admin</Link>
      </footer>
    </main>
  );
}
