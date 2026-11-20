import { ApiError } from "../utils/ApiError";
import { WhatsAppOrderInput, whatsappPhoneSchema } from "../validations/whatsapp.validation";

export interface OrderMenu {
  title: string;
  active: boolean;
  pos?: string | null;
  whatsappPhone?: string | null;
  categories: {
    active: boolean;
    items: { id: number; title: string; price: number | string | null; active: boolean }[];
  }[];
}

const formatPrice = (cents: number) => `$${(cents / 100).toLocaleString("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;
const singleLine = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

/** Prices, availability and destination always come from the public menu, never the request. */
export function prepareWhatsAppOrder(menu: OrderMenu, input: WhatsAppOrderInput) {
  if (!menu.active) throw new ApiError("El menú ya no está disponible", 404);
  const phone = whatsappPhoneSchema.safeParse(menu.whatsappPhone);
  if (!phone.success || !phone.data) {
    throw new ApiError("Este negocio no tiene habilitados los pedidos por WhatsApp", 409);
  }

  const available = new Map(menu.categories
    .filter((category) => category.active)
    .flatMap((category) => category.items.filter((item) => item.active))
    .map((item) => [item.id, item]));

  const items = input.items.map(({ itemId, quantity }) => {
    const item = available.get(itemId);
    if (!item) {
      throw new ApiError("Un producto ya no está disponible. Volvé a cargar el menú y revisá tu pedido.", 409, { itemId });
    }
    const numericPrice = item.price === null ? NaN : Number(item.price);
    const unitPriceCents = Number.isFinite(numericPrice) && numericPrice >= 0
      ? Math.round(numericPrice * 100) : null;
    return {
      itemId, title: item.title, quantity, unitPriceCents,
      subtotalCents: unitPriceCents === null ? null : unitPriceCents * quantity,
    };
  });
  const totalCents = items.reduce((total, item) => total + (item.subtotalCents ?? 0), 0);
  const hasUnpricedItems = items.some((item) => item.unitPriceCents === null);
  const message = [
    `¡Hola! Quiero hacer un pedido de ${singleLine(menu.title)}.`,
    ...(menu.pos ? [`Local: ${singleLine(menu.pos)}`] : []),
    "",
    ...items.map((item) => `${item.quantity} x ${singleLine(item.title)} — ${item.subtotalCents === null ? "Precio a confirmar" : formatPrice(item.subtotalCents)}`),
    "",
    `${hasUnpricedItems ? "Subtotal conocido" : "Total"}: ${formatPrice(totalCents)}`,
    ...(hasUnpricedItems ? ["Hay productos con precio a confirmar."] : []),
    ...(input.customerName ? ["", `Nombre / mesa: ${singleLine(input.customerName)}`] : []),
    ...(input.notes ? ["", `Observaciones: ${input.notes}`] : []),
    "", "Quedo a la espera de la confirmación del negocio.",
  ].join("\n");

  return {
    items, totalCents, hasUnpricedItems, message,
    whatsappUrl: `https://wa.me/${phone.data}?text=${encodeURIComponent(message)}`,
  };
}
