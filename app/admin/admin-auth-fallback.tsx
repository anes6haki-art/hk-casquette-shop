import Link from "next/link";

export function getAdminAuthFallbackMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "Set ADMIN_PASSWORD.") {
      return "متغير ADMIN_PASSWORD غير مضبوط على Vercel.";
    }
    if (error.message === "Production ADMIN_PASSWORD must contain at least 12 characters.") {
      return "يجب أن تتكون ADMIN_PASSWORD من 12 حرفاً على الأقل في بيئة الإنتاج.";
    }
    if (error.message === "ADMIN_SESSION_SECRET must contain at least 32 characters.") {
      return "يجب أن يتكون ADMIN_SESSION_SECRET من 32 حرفاً على الأقل.";
    }
  }

  return "تعذر التحقق من جلسة المسؤول. راجعوا تفاصيل الخطأ أدناه.";
}

export function getAdminErrorDetail(error: unknown) {
  if (error instanceof Error) {
    return error.message || error.name;
  }
  if (typeof error === "string") {
    return error;
  }
  return "حدث خطأ غير معروف.";
}

export default function AdminAuthFallback({
  message,
  errorDetail,
}: {
  message: string;
  errorDetail: string;
}) {
  return (
    <main className="admin-login-page">
      <section className="admin-login-card" role="alert">
        <span className="admin-eyebrow">إعدادات الإدارة</span>
        <h1>الإدارة غير متاحة.</h1>
        <p>{message}</p>
        <p>تفاصيل الخطأ:</p>
        <pre className="admin-error-detail">{errorDetail}</pre>
        <Link className="admin-back-link" href="/">العودة إلى المتجر</Link>
      </section>
    </main>
  );
}
