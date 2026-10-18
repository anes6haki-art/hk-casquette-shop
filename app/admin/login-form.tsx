"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAdmin, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAdmin, initialState);

  return (
    <form className="admin-login-card" action={formAction}>
      <span className="admin-eyebrow">مساحة خاصة</span>
      <h1>مرحباً بعودتكم.</h1>
      <p>سجلوا الدخول لإدارة القبعات والطلبات.</p>
      <label className="admin-login-field">
        <span>كلمة المرور</span>
        <input
          autoComplete="current-password"
          name="password"
          type="password"
          required
          autoFocus
        />
      </label>
      {state.error && <p className="admin-login-error" role="alert">{state.error}</p>}
      <button className="admin-primary-button" type="submit" disabled={pending}>
        {pending ? "جارٍ تسجيل الدخول…" : "تسجيل الدخول"}
      </button>
      <Link className="admin-back-link" href="/">→ العودة إلى المتجر</Link>
    </form>
  );
}
