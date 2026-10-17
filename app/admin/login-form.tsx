"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAdmin, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAdmin, initialState);

  return (
    <form className="admin-login-card" action={formAction}>
      <span className="admin-eyebrow">ESPACE PRIVÉ</span>
      <h1>Bon retour.</h1>
      <p>Connectez-vous pour gérer les casquettes et les commandes.</p>
      <label className="admin-login-field">
        <span>Mot de passe</span>
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
        {pending ? "Connexion…" : "Se connecter"}
      </button>
      <Link className="admin-back-link" href="/">← Retour à la boutique</Link>
    </form>
  );
}
