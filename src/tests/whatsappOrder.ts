import assert from "node:assert/strict";
import { QueryInterface } from "sequelize";
import { createMenuSchema, updateMenuSchema } from "../validations/menu.validation";
import { whatsappOrderSchema } from "../validations/whatsapp.validation";
import { OrderMenu, prepareWhatsAppOrder } from "../services/whatsappOrderService";
import { addMenuWhatsAppPhone } from "../migrations/addMenuWhatsAppPhone";
import { ApiError } from "../utils/ApiError";

export function registerWhatsAppTests(test: (name: string, run: () => void | Promise<void>) => void) {
  const menu: OrderMenu = {
    title: "La Esquina", active: true, whatsappPhone: "5491112345678", pos: "Local centro",
    categories: [{ active: true, items: [
      { id: 1, title: "Empanada de carne", price: "1200.50", active: true },
      { id: 2, title: "Coca", price: "2500.00", active: true },
      { id: 3, title: "Agotado", price: 100, active: false },
      { id: 4, title: "Especial", price: null, active: true },
      { id: 5, title: "Cortesía", price: "0.00", active: true },
    ] }],
  };
  const input = { items: [{ itemId: 1, quantity: 3 }, { itemId: 2, quantity: 1 }], customerName: "Mesa 4", notes: "Sin picante & con limón 🍋" };

  test("el menú normaliza WhatsApp y permite borrar el número sin modificarlo al omitirlo", () => {
    assert.equal(createMenuSchema.parse({ title: "Local", whatsappPhone: "+54 9 (11) 1234-5678" }).whatsappPhone, "5491112345678");
    assert.equal(updateMenuSchema.parse({ whatsappPhone: "  " }).whatsappPhone, null);
    assert.equal(updateMenuSchema.parse({ whatsappPhone: null }).whatsappPhone, null);
    assert.equal(updateMenuSchema.parse({ title: "Local" }).whatsappPhone, undefined);
    assert.equal(createMenuSchema.parse({ payload: JSON.stringify({ title: "Local", whatsappPhone: "+54 9 11 1234 5678" }) }).whatsappPhone, "5491112345678");
    for (const whatsappPhone of ["01112345678", "123", "abc5491112345678", "https://wa.me/5491112345678", "9".repeat(16)]) {
      assert.equal(updateMenuSchema.safeParse({ whatsappPhone }).success, false);
    }
  });

  test("WhatsApp incluye 3 empanadas, 1 coca, total, local y observaciones codificados", () => {
    const order = prepareWhatsAppOrder(menu, input);
    assert.equal(order.totalCents, 610150);
    assert.equal(order.hasUnpricedItems, false);
    assert.match(order.message, /3 x Empanada de carne/);
    assert.match(order.message, /1 x Coca/);
    assert.match(order.message, /Total: \$6\.101,50/);
    assert.match(order.message, /Local: Local centro/);
    assert.match(order.message, /Nombre \/ mesa: Mesa 4/);
    const url = new URL(order.whatsappUrl);
    assert.equal(url.hostname, "wa.me");
    assert.equal(url.pathname, "/5491112345678");
    assert.equal(url.searchParams.get("text"), order.message);
    assert.ok(order.message.includes(input.notes));
  });

  test("el pedido rechaza cantidades inválidas, duplicados, precios o destinos del cliente", () => {
    for (const quantity of [0, -1, 1.5, 100, "3"]) {
      assert.equal(whatsappOrderSchema.safeParse({ items: [{ itemId: 1, quantity }] }).success, false);
    }
    for (const value of [
      { items: [] },
      { items: [{ itemId: 1, quantity: 1 }, { itemId: 1, quantity: 1 }] },
      { items: [{ itemId: 1, quantity: 1, price: 0 }] },
      { ...input, whatsappPhone: "5491199999999" },
      { ...input, total: 1 },
      { ...input, notes: "a".repeat(501) },
      { items: Array.from({ length: 51 }, (_, index) => ({ itemId: index + 1, quantity: 1 })) },
    ]) assert.equal(whatsappOrderSchema.safeParse(value).success, false);
  });

  test("productos ajenos, inactivos o en categorías inactivas no se envían", () => {
    for (const itemId of [3, 999]) {
      assert.throws(() => prepareWhatsAppOrder(menu, { items: [{ itemId, quantity: 1 }] }), (error: unknown) => error instanceof ApiError && error.statusCode === 409);
    }
    const hidden = { ...menu, categories: [{ ...menu.categories[0], active: false }] };
    assert.throws(() => prepareWhatsAppOrder(hidden, input), /ya no está disponible/);
  });

  test("se usan precios actuales y se distinguen precios pendientes de los gratuitos", () => {
    const updated = { ...menu, categories: [{ active: true, items: [{ ...menu.categories[0].items[0], price: "1500.00" }] }] };
    assert.equal(prepareWhatsAppOrder(updated, { items: [{ itemId: 1, quantity: 3 }] }).totalCents, 450000);
    const order = prepareWhatsAppOrder(menu, { items: [{ itemId: 4, quantity: 1 }, { itemId: 5, quantity: 2 }] });
    assert.equal(order.hasUnpricedItems, true);
    assert.equal(order.items[0].subtotalCents, null);
    assert.equal(order.items[1].subtotalCents, 0);
    assert.match(order.message, /Subtotal conocido/);
    assert.match(order.message, /Precio a confirmar/);
  });

  test("el pedido exige un menú activo con WhatsApp configurado", () => {
    assert.throws(() => prepareWhatsAppOrder({ ...menu, active: false }, input), /no está disponible/);
    for (const whatsappPhone of [null, "", "incorrecto"]) {
      assert.throws(() => prepareWhatsAppOrder({ ...menu, whatsappPhone }, input), /no tiene habilitados/);
    }
  });

  test("la migración agrega solo la columna faltante y puede repetirse", async () => {
    let added = 0;
    const queryInterface = {
      describeTable: async () => added ? { whatsappPhone: {} } : { id: {} },
      addColumn: async (table: string, column: string) => {
        assert.equal(table, "menus");
        assert.equal(column, "whatsappPhone");
        added += 1;
      },
    } as unknown as QueryInterface;
    await addMenuWhatsAppPhone(queryInterface);
    await addMenuWhatsAppPhone(queryInterface);
    assert.equal(added, 1);
  });
}
