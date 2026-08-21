import "dotenv/config";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import mysql from "mysql2/promise";

type Json = any;

const EXPECTED_E2E_DATABASE = "api_menu_e2e";

async function ensureIsolatedDatabase() {
  const database = process.env.DB_NAME;
  assert.equal(
    database,
    EXPECTED_E2E_DATABASE,
    `La prueba E2E solo puede usar ${EXPECTED_E2E_DATABASE}`
  );

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${EXPECTED_E2E_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await connection.end();
  }
}

async function closeServer(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function main() {
  await ensureIsolatedDatabase();

  const [
    { default: app },
    { default: sequelize },
    { setupAssociations },
    { loadSchemaLimits },
    { enableStrictMode },
  ] = await Promise.all([
    import("../app"),
    import("../utils/databaseService"),
    import("../models/associations"),
    import("../utils/schemaLimits"),
    import("../utils/sqlStrictMode"),
  ]);

  setupAssociations();
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
  await enableStrictMode();
  await loadSchemaLimits(["users", "payments", "roles"]);

  const server = await new Promise<Server>((resolve) => {
    const running = app.listen(0, () => resolve(running));
  });
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  async function request(
    method: string,
    path: string,
    options: {
      token?: string;
      tenant?: string;
      body?: Record<string, unknown> | FormData;
    } = {}
  ) {
    const headers = new Headers();
    if (options.token) headers.set("Authorization", `Bearer ${options.token}`);
    if (options.tenant) headers.set("x-tenant-subdomain", options.tenant);

    let body: BodyInit | undefined;
    if (options.body instanceof FormData) {
      body = options.body;
    } else if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(options.body);
    }

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body,
    });
    const text = await response.text();
    let payload: Json = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text };
      }
    }

    return { status: response.status, body: payload };
  }

  const ok = (name: string) => console.log(`✓ ${name}`);

  try {
    const suffix = Date.now();
    const registrationBody = {
      name: "Free",
      lastName: "E2E",
      email: `free-e2e-${suffix}@example.com`,
      cel: "",
      password: "Clave123",
      confirmationPassword: "Clave123",
    };

    const registration = await request("POST", "/api/auth/register-free", {
      body: registrationBody,
    });
    assert.equal(registration.status, 201);
    assert.equal(registration.body.account.plan, "free");
    assert.deepEqual(registration.body.account.limits, {
      menus: 1,
      itemsPerMenu: 10,
      images: false,
    });
    assert.ok(registration.body.token);
    assert.ok(registration.body.user.subdomain);
    ok("registro Free real en MySQL");

    const token = registration.body.token as string;
    const user = registration.body.user as {
      id: number;
      subdomain: string;
    };

    const duplicate = await request("POST", "/api/auth/register-free", {
      body: registrationBody,
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.details.code, "EMAIL_ALREADY_IN_USE");
    ok("email duplicado rechazado");

    const login = await request("POST", "/api/auth/login", {
      body: {
        email: registrationBody.email,
        password: registrationBody.password,
      },
    });
    assert.equal(login.status, 200);
    assert.equal(login.body.account.plan, "free");
    ok("login Free devuelve capacidades");

    const me = await request("GET", "/api/auth/me", { token });
    assert.equal(me.status, 200);
    assert.equal(me.body.user.id, user.id);
    assert.equal(me.body.account.limits.itemsPerMenu, 10);
    ok("GET /api/auth/me restaura la sesión");

    const firstMenu = await request("POST", "/api/menus", {
      token,
      tenant: user.subdomain,
      body: {
        title: "Menú Free E2E",
        active: false,
        color: { primary: "#FF6B35", secondary: "#FFFFFF" },
      },
    });
    assert.equal(firstMenu.status, 201);
    assert.equal(firstMenu.body.active, true);
    const firstMenuId = firstMenu.body.id as number;
    ok("primer menú creado y forzado a activo");

    const secondMenu = await request("POST", "/api/menus", {
      token,
      tenant: user.subdomain,
      body: { title: "Segundo menú" },
    });
    assert.equal(secondMenu.status, 403);
    assert.equal(secondMenu.body.details.code, "FREE_PLAN_MENU_LIMIT");
    ok("segundo menú rechazado");

    const category = await request("POST", "/api/categories", {
      token,
      tenant: user.subdomain,
      body: { menuId: firstMenuId, title: "Categoría E2E", active: true },
    });
    assert.equal(category.status, 201);
    const categoryId = category.body.id as number;
    ok("categoría creada");

    let firstItemId = 0;
    for (let index = 1; index <= 10; index += 1) {
      const item = await request("POST", "/api/items", {
        token,
        tenant: user.subdomain,
        body: {
          categoryId,
          title: `Ítem ${index}`,
          description: `Descripción ${index}`,
          price: index * 100,
          active: true,
        },
      });
      assert.equal(item.status, 201, `falló la creación del ítem ${index}`);
      if (index === 1) firstItemId = item.body.id as number;
    }
    ok("10 ítems creados correctamente");

    const eleventhItem = await request("POST", "/api/items", {
      token,
      tenant: user.subdomain,
      body: { categoryId, title: "Ítem 11", price: 1100 },
    });
    assert.equal(eleventhItem.status, 403);
    assert.equal(eleventhItem.body.details.code, "FREE_PLAN_ITEM_LIMIT");
    assert.equal(eleventhItem.body.details.current, 10);
    ok("ítem 11 rechazado");

    const csv = [
      "type,categoryTitle,itemTitle,itemDescription,itemPrice,itemActive",
      "category,Bebidas,,,,",
      "item,,Agua,Agua mineral,1000,true",
    ].join("\n");
    const csvForm = new FormData();
    csvForm.append("file", new Blob([csv], { type: "text/csv" }), "menu.csv");
    const csvImport = await request(
      "POST",
      `/api/menus/${firstMenuId}/import-csv`,
      { token, tenant: user.subdomain, body: csvForm }
    );
    assert.equal(csvImport.status, 403);
    assert.equal(csvImport.body.details.code, "FREE_PLAN_ITEM_LIMIT");
    ok("CSV que excede la cuota rechazado sin importación parcial");

    const imageByUrl = await request("POST", "/api/images", {
      token,
      tenant: user.subdomain,
      body: {
        menuId: firstMenuId,
        url: "https://example.com/image.jpg",
      },
    });
    assert.equal(imageByUrl.status, 403);
    assert.equal(imageByUrl.body.details.code, "FREE_PLAN_IMAGES_DISABLED");
    ok("imagen por URL rechazada");

    const imageForm = new FormData();
    imageForm.append(
      "payload",
      JSON.stringify({ images: [{ fileField: "file" }] })
    );
    imageForm.append(
      "file",
      new Blob([Buffer.from("not-a-real-png")], { type: "image/png" }),
      "test.png"
    );
    const itemImage = await request(
      "PUT",
      `/api/images/items/${firstItemId}`,
      { token, tenant: user.subdomain, body: imageForm }
    );
    assert.equal(itemImage.status, 403);
    assert.equal(itemImage.body.details.code, "FREE_PLAN_IMAGES_DISABLED");
    ok("upload multipart de imagen rechazado antes de S3");

    const menuLogo = await request("PUT", `/api/menus/${firstMenuId}`, {
      token,
      tenant: user.subdomain,
      body: { logo: "https://example.com/logo.png" },
    });
    assert.equal(menuLogo.status, 403);
    assert.equal(menuLogo.body.details.code, "FREE_PLAN_IMAGES_DISABLED");
    ok("logo por URL rechazado");

    const secondRegistration = await request(
      "POST",
      "/api/auth/register-free",
      {
        body: {
          ...registrationBody,
          email: `other-free-e2e-${suffix}@example.com`,
          name: "Other",
        },
      }
    );
    assert.equal(secondRegistration.status, 201);

    const wrongTenant = await request("GET", "/api/menus", {
      token,
      tenant: secondRegistration.body.user.subdomain,
    });
    assert.equal(wrongTenant.status, 403);
    assert.equal(wrongTenant.body.details.code, "TENANT_ACCESS_DENIED");
    ok("acceso cruzado entre tenants rechazado");

    const roleEscalation = await request("PUT", `/api/users/${user.id}`, {
      token,
      body: { roleId: 1 },
    });
    assert.equal(roleEscalation.status, 403);
    assert.equal(roleEscalation.body.details.code, "ROLE_CHANGE_DENIED");
    ok("escalación propia de rol rechazada");

    const deletedMenu = await request("DELETE", `/api/menus/${firstMenuId}`, {
      token,
      tenant: user.subdomain,
    });
    assert.equal(deletedMenu.status, 204);

    const replacementMenu = await request("POST", "/api/menus", {
      token,
      tenant: user.subdomain,
      body: { title: "Menú reemplazo" },
    });
    assert.equal(replacementMenu.status, 201);
    ok("un menú eliminado puede reemplazarse");

    const reactivateOldMenu = await request(
      "PUT",
      `/api/menus/${firstMenuId}`,
      {
        token,
        tenant: user.subdomain,
        body: { active: true },
      }
    );
    assert.equal(reactivateOldMenu.status, 403);
    assert.equal(
      reactivateOldMenu.body.details.code,
      "FREE_PLAN_MENU_LIMIT"
    );
    ok("no se pueden reactivar dos menús simultáneamente");

    console.log("\nE2E Free aprobado: 17 escenarios HTTP + MySQL");
  } finally {
    await closeServer(server);
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error("E2E Free falló");
  console.error(error);
  process.exitCode = 1;
});
