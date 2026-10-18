"use client";

import { useState } from "react";

type DhdDispatchButtonProps = {
  orderId: string;
};

export default function DhdDispatchButton({ orderId }: DhdDispatchButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendToDhd() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/delivery/dhd", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "تعذر إنشاء الشحنة.";
        throw new Error(message);
      }

      window.location.reload();
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "حدث خطأ غير متوقع.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="dhd-dispatch">
      <button type="button" onClick={sendToDhd} disabled={pending}>
        {pending ? "جارٍ الإرسال…" : "إرسال إلى DHD"}
      </button>
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
