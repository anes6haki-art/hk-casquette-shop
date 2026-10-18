import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { getOrdersForAdmin, getShippingRatesForAdmin } from "@/lib/orders";
import { DELIVERY_LABELS, ORDER_STATUSES, isOrderStatus, type DeliveryType } from "@/lib/store-data";
import AdminAuthFallback, {
  getAdminAuthFallbackMessage,
  getAdminErrorDetail,
} from "./admin-auth-fallback";
import { logoutAdmin, updateOrderStatus, updateShippingRate } from "./actions";
import DhdDispatchButton from "./dhd-dispatch-button";

export const instant = false;

const statusLabels = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
} as const;

function formatPrice(amount: number) {
  return `${new Intl.NumberFormat("fr-DZ").format(amount)} DA`;
}

export default async function AdminDashboardPage() {
  await connection();

  let isAuthenticated: boolean;
  try {
    isAuthenticated = await hasAdminSession();
  } catch (error: unknown) {
    console.error("Failed to validate admin session for dashboard.", error);
    return (
      <AdminAuthFallback
        message={getAdminAuthFallbackMessage(error)}
        errorDetail={getAdminErrorDetail(error)}
      />
    );
  }

  if (!isAuthenticated) {
    redirect("/admin/login");
  }

  const [ordersResult, shippingRatesResult] = await Promise.all([
    (async () => {
      try {
        return { data: await getOrdersForAdmin(), error: false };
      } catch (error: unknown) {
        console.error("Failed to load admin orders.", error);
        return { data: [], error: getAdminErrorDetail(error) };
      }
    })(),
    (async () => {
      try {
        return { data: await getShippingRatesForAdmin(), error: false };
      } catch (error: unknown) {
        console.error("Failed to load admin shipping rates.", error);
        return { data: [], error: getAdminErrorDetail(error) };
      }
    })(),
  ]);
  const { data: orders, error: ordersError } = ordersResult;
  const { data: shippingRates, error: shippingRatesError } = shippingRatesResult;
  const hasOrdersError = typeof ordersError === "string";
  const hasShippingRatesError = typeof shippingRatesError === "string";
  const pendingCount = orders.filter((order) => order.status === "PENDING").length;
  const confirmedCount = orders.filter((order) => order.status === "CONFIRMED").length;
  const deliveredCount = orders.filter((order) => order.status === "DELIVERED").length;

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link className="shop-brand admin-shop-brand" href="/"><span className="shop-brand-mark">HK</span><span>Hk casquette shop</span></Link>
        <nav className="admin-header-links" aria-label="Navigation administration">
          <Link href="/admin" aria-current="page">Commandes & livraison</Link>
          <Link href="/admin/products">Produits</Link>
        </nav>
        <div className="admin-header-right">
          <span className="admin-access"><span /> Espace administrateur</span>
          <form action={logoutAdmin}>
            <button className="admin-logout-button" type="submit">Déconnexion <span aria-hidden="true">↗</span></button>
          </form>
        </div>
      </header>

      <section className="admin-content">
        <div className="admin-page-heading">
          <div>
            <span className="admin-eyebrow">VOTRE BOUTIQUE, EN UN COUP D’ŒIL</span>
            <h1>Commandes<span>.</span></h1>
            <p>Suivez et gérez les commandes de vos clients.</p>
          </div>
          {!hasOrdersError && (
            <span className="admin-order-count">{orders.length} commande{orders.length === 1 ? "" : "s"}</span>
          )}
        </div>

        {hasOrdersError && (
          <p className="admin-data-error" role="alert">
            Impossible de charger les commandes. Vérifiez DATABASE_URL et que le schéma PostgreSQL a été poussé sur cette base.
            <br />
            <strong>Détail de l’erreur :</strong> {ordersError}
          </p>
        )}
        {!hasOrdersError && <div className="admin-stats">
          <article><span>Total commandes</span><strong>{orders.length}</strong><small>Toutes périodes</small></article>
          <article><span>En attente</span><strong>{pendingCount}</strong><small>À traiter</small></article>
          <article><span>Confirmées</span><strong>{confirmedCount}</strong><small>En préparation</small></article>
          <article><span>Livrées</span><strong>{deliveredCount}</strong><small>Commandes terminées</small></article>
        </div>}

        {!hasOrdersError && <section className="admin-table-card" aria-labelledby="orders-title">
          <div className="admin-table-heading">
            <div><h2 id="orders-title">Toutes les commandes</h2><p>Les commandes les plus récentes apparaissent en premier.</p></div>
          </div>
          {orders.length === 0 ? (
            <div className="admin-empty">
              <span aria-hidden="true">✳</span>
              <strong>Pas encore de commandes</strong>
              <p>Les nouvelles commandes de votre boutique apparaîtront ici.</p>
            </div>
          ) : (
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Produit</th>
                    <th>Téléphone</th>
                    <th>Livraison</th>
                    <th>Mode de livraison</th>
                    <th>Qté</th>
                    <th>Total</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th>Mettre à jour</th>
                    <th>Livraison DHD</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const status = isOrderStatus(order.status) ? order.status : "PENDING";
                    return (
                      <tr key={order.id}>
                        <td><strong>{order.name}</strong></td>
                        <td>
                          <strong>{order.productTitle}</strong>
                          {order.items.length > 0 && (
                            <small className="admin-order-items">
                              {order.items.map((item) => `${item.quantity}x ${item.title} ${item.color} (${item.size})`).join(" · ")}
                            </small>
                          )}
                        </td>
                        <td>{order.phone}</td>
                        <td><strong>{order.wilaya}</strong><small>{order.commune}</small></td>
                        <td>{DELIVERY_LABELS[order.deliveryType as DeliveryType] ?? "À domicile"}</td>
                        <td>{order.quantity}</td>
                        <td className="admin-price">{formatPrice(order.totalPrice)}</td>
                        <td className="admin-date">{new Intl.DateTimeFormat("fr-DZ", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(order.createdAt)}</td>
                        <td><span className={`status-badge status-${status.toLowerCase()}`}>{statusLabels[status]}</span></td>
                        <td>
                          <form className="admin-status-form" action={updateOrderStatus}>
                            <input type="hidden" name="orderId" value={order.id} />
                            <select name="status" defaultValue={status} aria-label={`Statut de la commande de ${order.name}`}>
                              {ORDER_STATUSES.map((option) => <option key={option} value={option}>{statusLabels[option]}</option>)}
                            </select>
                            <button type="submit" aria-label={`Enregistrer le statut de ${order.name}`}>OK</button>
                          </form>
                        </td>
                        <td>
                          {order.trackingNumber ? (
                            <div className="dhd-tracking">
                              <strong>{order.trackingNumber}</strong>
                              {order.deliveryStatus && <small>{order.deliveryStatus}</small>}
                            </div>
                          ) : status === "CONFIRMED" ? (
                            <DhdDispatchButton orderId={order.id} />
                          ) : (
                            <span className="dhd-unavailable">Disponible après confirmation</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>}

        {hasShippingRatesError && (
          <p className="admin-data-error" role="alert">
            Impossible de charger les tarifs de livraison. Vérifiez DATABASE_URL et que le schéma PostgreSQL a été poussé sur cette base.
            <br />
            <strong>Détail de l’erreur :</strong> {shippingRatesError}
          </p>
        )}
        {!hasShippingRatesError && <section className="admin-table-card shipping-settings-card" aria-labelledby="shipping-settings-title">
          <div className="admin-table-heading">
            <div>
              <h2 id="shipping-settings-title">Tarifs de livraison par wilaya</h2>
              <p>Modifiez les tarifs à domicile et Stop Desk. Les commandes utilisent le tarif sauvegardé.</p>
            </div>
          </div>
          <div className="admin-table-scroll">
            <table className="admin-table shipping-rates-table">
              <thead>
                <tr>
                  <th>Wilaya</th>
                  <th>Livraison à domicile (DA)</th>
                  <th>Stop Desk / Bureau (DA)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {shippingRates.map((rate) => (
                  <tr key={rate.wilaya}>
                    <td><strong>{rate.wilaya}</strong></td>
                      <td>
                        <form id={`shipping-${rate.wilaya}`} action={updateShippingRate}>
                        <input type="hidden" name="wilaya" value={rate.wilaya} />
                        </form>
                        <label>
                          <span className="sr-only">Livraison à domicile pour {rate.wilaya}</span>
                          <input form={`shipping-${rate.wilaya}`} className="shipping-rate-input" name="homePrice" type="number" min="0" max="100000" step="1" defaultValue={rate.homePrice} required />
                        </label>
                      </td>
                      <td>
                        <label>
                          <span className="sr-only">Stop Desk pour {rate.wilaya}</span>
                          <input form={`shipping-${rate.wilaya}`} className="shipping-rate-input" name="deskPrice" type="number" min="0" max="100000" step="1" defaultValue={rate.deskPrice} required />
                        </label>
                      </td>
                      <td><button className="shipping-save-button" type="submit" form={`shipping-${rate.wilaya}`}>Enregistrer</button></td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>}
        <p className="admin-footer-note"><span aria-hidden="true">◉</span> Les données clients sont accessibles uniquement aux comptes administrateurs.</p>
      </section>
    </main>
  );
}
