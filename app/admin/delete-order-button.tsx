"use client";

import { deleteOrderAction } from "./actions";

export default function DeleteOrderButton({ orderId }: { orderId: string }) {
  return (
    <form action={deleteOrderAction} style={{ display: "inline" }}>
      <input type="hidden" name="orderId" value={orderId} />
      <button
        type="submit"
        style={{
          background: "#ef4444",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          padding: "6px 10px",
          cursor: "pointer",
        }}
        onClick={(e) => {
          if (!window.confirm("حذف الطلب؟")) e.preventDefault();
        }}
      >
        حذف
      </button>
    </form>
  );
}
