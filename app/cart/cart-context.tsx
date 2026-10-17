"use client";

import Image from "next/image";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "hk-casquette-cart-v1";

export type CartItem = {
  id: string;
  productId: string;
  variantId?: string;
  title: string;
  price: number;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
  image: string;
};

type CartItemInput = Omit<CartItem, "id">;
type CartContextValue = {
  items: CartItem[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (item: CartItemInput) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | null>(null);

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" &&
    typeof item.productId === "string" &&
    typeof item.title === "string" &&
    typeof item.selectedColor === "string" &&
    typeof item.selectedSize === "string" &&
    typeof item.quantity === "number" &&
    Number.isSafeInteger(item.quantity) &&
    item.quantity > 0 &&
    typeof item.price === "number" &&
    Number.isSafeInteger(item.price) &&
    item.price >= 0 &&
    typeof item.image === "string" &&
    (item.variantId === undefined || typeof item.variantId === "string");
}

function formatPrice(amount: number) {
  return `${new Intl.NumberFormat("fr-DZ").format(amount)} DA`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const restoreCart = () => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            let count = 0;
            const restored = parsed.filter(isCartItem).flatMap((item) => {
              const quantity = Math.min(item.quantity, 10 - count);
              if (quantity < 1) return [];
              count += quantity;
              return [{ ...item, quantity }];
            });
            setItems(restored);
          }
        }
      } catch (error) {
        console.error("Unable to restore the shopping cart:", error);
      } finally {
        setIsLoaded(true);
      }
    };
    const timeout = window.setTimeout(restoreCart, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Unable to persist the shopping cart:", error);
    }
  }, [items, isLoaded]);

  const addItem = useCallback((item: CartItemInput) => {
    setItems((current) => {
      const existing = current.find((line) =>
        line.productId === item.productId &&
        line.variantId === item.variantId &&
        line.selectedColor === item.selectedColor &&
        line.selectedSize === item.selectedSize,
      );
      const existingQuantity = existing?.quantity ?? 0;
      const availableQuantity = 10 - current.reduce((total, line) => total + line.quantity, 0) + existingQuantity;
      if (availableQuantity < 1) return current;
      if (existing) {
        return current.map((line) => line.id === existing.id
          ? { ...line, quantity: Math.min(line.quantity + item.quantity, availableQuantity), image: item.image || line.image }
          : line);
      }
      return [...current, { ...item, id: crypto.randomUUID(), quantity: Math.min(item.quantity, availableQuantity) }];
    });
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((current) => {
      const otherItemsQuantity = current.reduce((total, item) => total + (item.id === id ? 0 : item.quantity), 0);
      return current.map((item) => item.id === id
        ? { ...item, quantity: Math.max(1, Math.min(10 - otherItemsQuantity, quantity)) }
        : item);
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const value = useMemo(() => ({
    items,
    isOpen,
    setIsOpen,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    itemCount,
    subtotal,
  }), [items, isOpen, addItem, updateQuantity, removeItem, clearCart, itemCount, subtotal]);

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer />
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider.");
  return context;
}

export function CartButton() {
  const { itemCount, setIsOpen } = useCart();
  return (
    <button
      className="store-cart-button"
      type="button"
      onClick={() => setIsOpen(true)}
      aria-label={`Ouvrir le panier, ${itemCount} article${itemCount === 1 ? "" : "s"}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.6L21 8H6" />
        <circle cx="10" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </svg>
      <span>Panier</span>
      <span className="store-cart-count" aria-live="polite">{itemCount}</span>
    </button>
  );
}

function CartDrawer() {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, subtotal } = useCart();
  if (!isOpen) return null;

  return (
    <div className="cart-drawer-layer">
      <button className="cart-drawer-backdrop" type="button" aria-label="Fermer le panier" onClick={() => setIsOpen(false)} />
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
        <header className="cart-drawer-header">
          <div>
            <span className="shop-eyebrow">VOTRE SÉLECTION</span>
            <h2 id="cart-drawer-title">Panier <span>({items.length})</span></h2>
          </div>
          <button className="cart-drawer-close" type="button" onClick={() => setIsOpen(false)} aria-label="Fermer le panier">×</button>
        </header>

        {items.length === 0 ? (
          <div className="cart-drawer-empty">
            <span aria-hidden="true">◇</span>
            <strong>Votre panier est vide</strong>
            <p>Ajoutez une casquette pour commencer votre sélection.</p>
            <button type="button" onClick={() => setIsOpen(false)}>Continuer la visite</button>
          </div>
        ) : (
          <>
            <div className="cart-drawer-items">
              {items.map((item) => (
                <article className="cart-drawer-item" key={item.id}>
                  {item.image
                    ? <Image src={item.image} alt="" width={78} height={78} unoptimized />
                    : <span className="cart-item-image-fallback" aria-hidden="true">HK</span>}
                  <div className="cart-drawer-item-copy">
                    <strong>{item.title}</strong>
                    <span>{item.selectedColor} · {item.selectedSize}</span>
                    <b>{formatPrice(item.price * item.quantity)}</b>
                    <div className="cart-drawer-item-actions">
                      <div className="cart-quantity-control">
                        <button type="button" aria-label="Diminuer" disabled={item.quantity <= 1} onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                        <span>{item.quantity}</span>
                        <button type="button" aria-label="Augmenter" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                      </div>
                      <button className="cart-remove-button" type="button" onClick={() => removeItem(item.id)}>Supprimer</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <footer className="cart-drawer-footer">
              <div><span>Sous-total</span><strong>{formatPrice(subtotal)}</strong></div>
              <small>Les frais de livraison seront calculés à l’étape suivante.</small>
              <Link className="cart-checkout-button" href="/checkout" onClick={() => setIsOpen(false)}>
                Passer la commande <span aria-hidden="true">→</span>
              </Link>
              <button className="cart-continue-button" type="button" onClick={() => setIsOpen(false)}>Continuer mes achats</button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
