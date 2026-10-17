import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type DhdShipmentResponse = {
  trackingNumber?: unknown;
  tracking_number?: unknown;
  deliveryStatus?: unknown;
  status?: unknown;
  message?: unknown;
};

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: "Accès non autorisé." }, { status: 401 });
  }

  const apiKey = process.env.DHD_API_KEY?.trim();
  const apiSecret = process.env.DHD_API_SECRET?.trim();
  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Clé API DHD non configurée" },
      { status: 503 },
    );
  }

  const apiUrl = process.env.DHD_API_URL?.trim();
  if (!apiUrl) {
    return NextResponse.json(
      { error: "Point d’accès API DHD non configuré." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("orderId" in body) ||
    typeof body.orderId !== "string" ||
    !body.orderId.trim()
  ) {
    return NextResponse.json({ error: "Identifiant de commande invalide." }, { status: 400 });
  }
  const orderId = body.orderId;

  const orderResult = await (async () => {
    try {
      return {
        order: await prisma.order.findUnique({
          where: { id: orderId },
          select: {
            id: true,
            name: true,
            phone: true,
            productTitle: true,
            wilaya: true,
            commune: true,
            quantity: true,
            totalPrice: true,
            deliveryType: true,
            status: true,
            trackingNumber: true,
            items: {
              select: {
                title: true,
                color: true,
                size: true,
                quantity: true,
              },
            },
          },
        }),
        error: false,
      };
    } catch (error: unknown) {
      console.error("Failed to load order for DHD dispatch.", error);
      return { order: null, error: true };
    }
  })();
  if (orderResult.error) {
    return NextResponse.json({ error: "Impossible de charger la commande." }, { status: 500 });
  }
  const { order } = orderResult;

  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }
  if (order.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "Seules les commandes confirmées peuvent être envoyées à DHD." },
      { status: 409 },
    );
  }
  if (order.trackingNumber) {
    return NextResponse.json({ trackingNumber: order.trackingNumber });
  }

  let endpoint: URL;
  try {
    endpoint = new URL(apiUrl);
    if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) {
      throw new Error("Unsupported URL protocol.");
    }
  } catch {
    return NextResponse.json({ error: "Le point d’accès API DHD est invalide." }, { status: 503 });
  }

  let dhdResponse: Response;
  try {
    dhdResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "x-api-secret": apiSecret,
      },
      body: JSON.stringify({
        reference: order.id,
        recipient: {
          name: order.name,
          phone: order.phone,
          wilaya: order.wilaya,
          commune: order.commune,
        },
        parcel: {
          description: order.items.length > 0
            ? order.items.map((item) => `${item.title} ${item.color} (${item.size}) × ${item.quantity}`).join(", ")
            : order.productTitle,
          quantity: order.quantity,
          deliveryType: order.deliveryType,
          cashOnDelivery: order.totalPrice,
        },
      }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch (error: unknown) {
    console.error("DHD shipment request failed.", error);
    return NextResponse.json({ error: "Impossible de joindre l’API DHD." }, { status: 502 });
  }

  let responseData: DhdShipmentResponse;
  try {
    responseData = (await dhdResponse.json()) as DhdShipmentResponse;
  } catch (error: unknown) {
    console.error("DHD returned an invalid JSON response.", error);
    return NextResponse.json({ error: "Réponse invalide de l’API DHD." }, { status: 502 });
  }

  if (!dhdResponse.ok) {
    const message =
      typeof responseData.message === "string"
        ? responseData.message
        : "DHD a refusé la création de l’envoi.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const trackingNumber =
    typeof responseData.trackingNumber === "string"
      ? responseData.trackingNumber
      : typeof responseData.tracking_number === "string"
        ? responseData.tracking_number
        : null;
  if (!trackingNumber) {
    return NextResponse.json(
      { error: "La réponse DHD ne contient pas de numéro de suivi." },
      { status: 502 },
    );
  }

  const deliveryStatus =
    typeof responseData.deliveryStatus === "string"
      ? responseData.deliveryStatus
      : typeof responseData.status === "string"
        ? responseData.status
        : "CREATED";

  try {
    await prisma.order.update({
      where: { id: order.id },
      data: { trackingNumber, deliveryStatus },
    });
  } catch (error: unknown) {
    console.error("DHD shipment was created but its tracking data could not be saved.", error);
    return NextResponse.json(
      { error: "Envoi créé, mais le numéro de suivi n’a pas pu être enregistré." },
      { status: 500 },
    );
  }

  return NextResponse.json({ trackingNumber, deliveryStatus });
}
