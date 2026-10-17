import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { getProductsForAdmin } from "@/lib/products";
import ProductsManager from "./products-manager";

export const instant = false;

export default async function AdminProductsPage() {
  await connection();
  if (!(await hasAdminSession())) redirect("/admin/login");
  let products: Awaited<ReturnType<typeof getProductsForAdmin>> = [];
  let productsError = false;
  try {
    products = await getProductsForAdmin();
  } catch (error: unknown) {
    console.error("Failed to load admin products.", error);
    productsError = true;
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link className="shop-brand admin-shop-brand" href="/"><span className="shop-brand-mark">HK</span><span>Hk casquette shop</span></Link>
        <nav className="admin-header-links" aria-label="Navigation administration">
          <Link href="/admin">Commandes & livraison</Link>
          <Link href="/admin/products" aria-current="page">Produits</Link>
        </nav>
        <Link className="admin-logout-button" href="/admin">Retour au tableau de bord</Link>
      </header>
      <section className="admin-content products-content">
        <div className="admin-page-heading">
          <div>
            <span className="admin-eyebrow">CATALOGUE DE LA BOUTIQUE</span>
            <h1>Produits<span>.</span></h1>
            <p>Gérez les casquettes disponibles dans votre catalogue.</p>
          </div>
          {!productsError && (
            <span className="admin-order-count">{products.length} produit{products.length === 1 ? "" : "s"}</span>
          )}
        </div>
        {productsError ? (
          <p className="admin-data-error" role="alert">
            Impossible de charger les produits. Vérifiez la connexion SQLite puis lancez « npx prisma db push ».
          </p>
        ) : (
          <ProductsManager products={products} />
        )}
      </section>
    </main>
  );
}
