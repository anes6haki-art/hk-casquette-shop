"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="admin-login-page">
      <section className="admin-login-card" role="alert">
        <span className="admin-eyebrow">خطأ في الخادم</span>
        <h1>صفحة الإدارة غير متاحة.</h1>
        <p>
          راجعوا سجلات Vercel لمعرفة السبب. يساعد هذا المعرّف في العثور على الخطأ في السجلات:
        </p>
        <p>{error.digest ?? "المعرّف غير متاح"}</p>
        <button className="admin-primary-button" onClick={() => reset()}>
          إعادة المحاولة
        </button>
      </section>
    </main>
  );
}
