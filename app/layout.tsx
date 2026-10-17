import type { Metadata } from "next";
import { CartProvider } from "./cart/cart-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hk casquette shop — Casquettes en Algérie",
  description:
    "Découvrez la collection Hk casquette shop. Commandez vos casquettes avec livraison dans les 58 wilayas et paiement à la réception.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
