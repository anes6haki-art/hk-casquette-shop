import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { getOrdersForAdmin, getShippingRatesForAdmin } from "@/lib/orders";
import { DELIVERY_LABELS, getColorLabelAr, getProductTitleAr, getWilayaLabelAr, ORDER_STATUSES, isOrderStatus, type DeliveryType } from "@/lib/store-data";
import AdminAuthFallback, {
  getAdminAuthFallbackMessage,
  getAdminErrorDetail,
} from "./admin-auth-fallback";
import { logoutAdmin, updateOrderStatus, updateShippingRate } from "./actions";
import DeleteOrderButton from "./delete-order-button";
import DhdDispatchButton from "./dhd-dispatch-button";

export const instant = false;

const statusLabels = {
  PENDING: "قيد الانتظار",
  CONFIRMED: "مؤكد",
  SHIPPED: "تم الشحن",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغى",
} as const;

function formatPrice(amount: number) {
  return `${new Intl.NumberFormat("ar-DZ").format(amount)} دج`;
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
        <Link className="shop-brand admin-shop-brand" href="/"><span className="shop-brand-mark">HK</span><span>متجر HK للقبعات</span></Link>
        <nav className="admin-header-links" aria-label="التنقل في الإدارة">
          <Link href="/admin" aria-current="page">الطلبات والتوصيل</Link>
          <Link href="/admin/products">المنتجات</Link>
        </nav>
        <div className="admin-header-right">
          <span className="admin-access"><span /> مساحة الإدارة</span>
          <form action={logoutAdmin}>
            <button className="admin-logout-button" type="submit">تسجيل الخروج <span aria-hidden="true">↗</span></button>
          </form>
        </div>
      </header>

      <section className="admin-content">
        <div className="admin-page-heading">
          <div>
            <span className="admin-eyebrow">متجركم بنظرة واحدة</span>
            <h1>الطلبات<span>.</span></h1>
            <p>تابعوا طلبات العملاء وأديروها.</p>
          </div>
          {!hasOrdersError && (
            <span className="admin-order-count">{orders.length} طلب</span>
          )}
        </div>

        {hasOrdersError && (
          <p className="admin-data-error" role="alert">
            تعذر تحميل الطلبات. تحققوا من إعداد قاعدة البيانات ومخطط PostgreSQL.
            <br />
            <strong>تفاصيل الخطأ:</strong> {ordersError}
          </p>
        )}
        {!hasOrdersError && <div className="admin-stats">
          <article><span>إجمالي الطلبات</span><strong>{orders.length}</strong><small>كل الفترات</small></article>
          <article><span>قيد الانتظار</span><strong>{pendingCount}</strong><small>تحتاج إلى معالجة</small></article>
          <article><span>مؤكدة</span><strong>{confirmedCount}</strong><small>قيد التحضير</small></article>
          <article><span>تم تسليمها</span><strong>{deliveredCount}</strong><small>طلبات مكتملة</small></article>
        </div>}

        {!hasOrdersError && <section className="admin-table-card" aria-labelledby="orders-title">
          <div className="admin-table-heading">
            <div><h2 id="orders-title">جميع الطلبات</h2><p>تظهر أحدث الطلبات أولاً.</p></div>
          </div>
          {orders.length === 0 ? (
            <div className="admin-empty">
              <span aria-hidden="true">✳</span>
              <strong>لا توجد طلبات بعد</strong>
              <p>ستظهر طلبات المتجر الجديدة هنا.</p>
            </div>
          ) : (
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>العميل</th>
                    <th>المنتج</th>
                    <th>الهاتف</th>
                    <th>التوصيل</th>
                    <th>طريقة التوصيل</th>
                    <th>الكمية</th>
                    <th>الإجمالي</th>
                    <th>التاريخ</th>
                    <th>الحالة</th>
                    <th>تحديث</th>
                    <th>شحن DHD</th>
                    <th>حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const status = isOrderStatus(order.status) ? order.status : "PENDING";
                    return (
                      <tr key={order.id}>
                        <td><strong>{order.name}</strong></td>
                        <td>
                          <strong>{getProductTitleAr(order.productTitle)}</strong>
                          {order.items.length > 0 && (
                            <small className="admin-order-items">
                              {order.items.map((item) => `${item.quantity} × ${getProductTitleAr(item.title)} ${getColorLabelAr(item.color)} (${item.size})`).join(" · ")}
                            </small>
                          )}
                        </td>
                        <td>{order.phone}</td>
                        <td><strong>{getWilayaLabelAr(order.wilaya)}</strong><small>{order.commune}</small></td>
                        <td>{DELIVERY_LABELS[order.deliveryType as DeliveryType] ?? "التوصيل إلى المنزل"}</td>
                        <td>{order.quantity}</td>
                        <td className="admin-price">{formatPrice(order.totalPrice)}</td>
                        <td className="admin-date">{new Intl.DateTimeFormat("ar-DZ", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(order.createdAt)}</td>
                        <td><span className={`status-badge status-${status.toLowerCase()}`}>{statusLabels[status]}</span></td>
                                                <td>
                                                  <form className="admin-status-form" action={updateOrderStatus}>
                                                    <input type="hidden" name="orderId" value={order.id} />
                            <select name="status" defaultValue={status} aria-label={`حالة طلب ${order.name}`}>
                              {ORDER_STATUSES.map((option) => <option key={option} value={option}>{statusLabels[option]}</option>)}
                            </select>
                            <button type="submit" aria-label={`حفظ حالة ${order.name}`}>حفظ</button>
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
                            <span className="dhd-unavailable">متاح بعد التأكيد</span>
                                                    )}
                        </td>
                        <td>
                                                  <DeleteOrderButton orderId={order.id} />
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
            تعذر تحميل رسوم التوصيل. تحققوا من إعداد قاعدة البيانات ومخطط PostgreSQL.
            <br />
            <strong>تفاصيل الخطأ:</strong> {shippingRatesError}
          </p>
        )}
        {!hasShippingRatesError && <section className="admin-table-card shipping-settings-card" aria-labelledby="shipping-settings-title">
          <div className="admin-table-heading">
            <div>
              <h2 id="shipping-settings-title">رسوم التوصيل حسب الولاية</h2>
              <p>عدّلوا رسوم التوصيل إلى المنزل أو المكتب. تُحسب الطلبات وفق الأسعار المحفوظة.</p>
            </div>
          </div>
          <div className="admin-table-scroll">
            <table className="admin-table shipping-rates-table">
              <thead>
                <tr>
                  <th>الولاية</th>
                  <th>التوصيل إلى المنزل (دج)</th>
                  <th>التوصيل إلى المكتب (دج)</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {shippingRates.map((rate) => (
                  <tr key={rate.wilaya}>
                    <td><strong>{getWilayaLabelAr(rate.wilaya)}</strong></td>
                      <td>
                        <form id={`shipping-${rate.wilaya}`} action={updateShippingRate}>
                        <input type="hidden" name="wilaya" value={rate.wilaya} />
                        </form>
                        <label>
                          <span className="sr-only">التوصيل إلى المنزل في {getWilayaLabelAr(rate.wilaya)}</span>
                          <input form={`shipping-${rate.wilaya}`} className="shipping-rate-input" name="homePrice" type="number" min="0" max="100000" step="1" defaultValue={rate.homePrice} required />
                        </label>
                      </td>
                      <td>
                        <label>
                          <span className="sr-only">التوصيل إلى المكتب في {getWilayaLabelAr(rate.wilaya)}</span>
                          <input form={`shipping-${rate.wilaya}`} className="shipping-rate-input" name="deskPrice" type="number" min="0" max="100000" step="1" defaultValue={rate.deskPrice} required />
                        </label>
                      </td>
                      <td><button className="shipping-save-button" type="submit" form={`shipping-${rate.wilaya}`}>حفظ</button></td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>}
        <p className="admin-footer-note"><span aria-hidden="true">◉</span> بيانات العملاء متاحة للمسؤولين فقط.</p>
      </section>
    </main>
  );
}
