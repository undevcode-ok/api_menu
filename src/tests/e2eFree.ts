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
    headers.set("Origin", "https://frontend.example");
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

    return {
      status: response.status,
      body: payload,
      requestId: response.headers.get("x-request-id"),
      exposedHeaders: response.headers.get("access-control-expose-headers"),
    };
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
    assert.ok(registration.requestId);
    assert.match(registration.exposedHeaders ?? "", /x-request-id/i);
    assert.equal(registration.body.account.plan, "free");
    assert.deepEqual(registration.body.account.limits, {
      menus: 1,
      categoriesPerMenu: 3,
      itemsPerMenu: 20,
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
    assert.equal(me.body.account.limits.itemsPerMenu, 20);
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
    ok("primera categoría creada");

    for (const title of ["Categoría 2", "Categoría 3"]) {
      const extraCategory = await request("POST", "/api/categories", {
        token,
        tenant: user.subdomain,
        body: { menuId: firstMenuId, title, active: true },
      });
      assert.equal(extraCategory.status, 201);
    }
    ok("Free puede crear hasta 3 categorías");

    const fourthCategory = await request("POST", "/api/categories", {
      token,
      tenant: user.subdomain,
      body: { menuId: firstMenuId, title: "Categoría 4", active: true },
    });
    assert.equal(fourthCategory.status, 403);
    assert.equal(
      fourthCategory.body.details.code,
      "FREE_PLAN_CATEGORY_LIMIT"
    );
    ok("cuarta categoría Free rechazada");

    const categoryCsv = [
      "type,categoryTitle,itemTitle",
      "category,Categoría desde CSV,",
    ].join("\n");
    const categoryCsvForm = new FormData();
    categoryCsvForm.append(
      "file",
      new Blob([categoryCsv], { type: "text/csv" }),
      "categories.csv"
    );
    const categoryCsvImport = await request(
      "POST",
      `/api/menus/${firstMenuId}/import-csv`,
      { token, tenant: user.subdomain, body: categoryCsvForm }
    );
    assert.equal(categoryCsvImport.status, 403);
    assert.equal(
      categoryCsvImport.body.details.code,
      "FREE_PLAN_CATEGORY_LIMIT"
    );
    ok("límite de categorías también se aplica al CSV");

    let firstItemId = 0;
    for (let index = 1; index <= 20; index += 1) {
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
    ok("20 ítems creados correctamente");

    const twentyFirstItem = await request("POST", "/api/items", {
      token,
      tenant: user.subdomain,
      body: { categoryId, title: "Ítem 21", price: 2100 },
    });
    assert.equal(twentyFirstItem.status, 403);
    assert.equal(twentyFirstItem.body.details.code, "FREE_PLAN_ITEM_LIMIT");
    assert.equal(twentyFirstItem.body.details.current, 20);
    ok("ítem 21 rechazado");

    const csv = [
      "type,categoryTitle,itemTitle,itemDescription,itemPrice,itemActive",
      "category,Categoría E2E,,,,",
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

    await sequelize.query(
      `INSERT INTO roles (role, active, createdAt, updatedAt)
       VALUES ('Client', 1, NOW(), NOW())
       ON DUPLICATE KEY UPDATE active = 1, updatedAt = NOW()`
    );
    await sequelize.query(
      `UPDATE users
       SET roleId = (SELECT id FROM roles WHERE role = 'Client' LIMIT 1),
           updatedAt = NOW()
       WHERE id = :userId`,
      { replacements: { userId: secondRegistration.body.user.id } }
    );

    const standardLogin = await request("POST", "/api/auth/login", {
      body: {
        email: secondRegistration.body.user.email,
        password: registrationBody.password,
      },
    });
    assert.equal(standardLogin.status, 200);
    assert.deepEqual(standardLogin.body.account.limits, {
      menus: 3,
      categoriesPerMenu: null,
      itemsPerMenu: null,
      images: true,
    });
    const standardToken = standardLogin.body.token as string;
    const standardTenant = secondRegistration.body.user.subdomain as string;
    ok("rol Client informa límite de 3 menús");

    const standardMenuIds: number[] = [];
    for (let index = 1; index <= 3; index += 1) {
      const standardMenu = await request("POST", "/api/menus", {
        token: standardToken,
        tenant: standardTenant,
        body: { title: `Menú estándar ${index}` },
      });
      assert.equal(standardMenu.status, 201);
      standardMenuIds.push(standardMenu.body.id as number);
    }
    ok("Client puede crear 3 menús activos");

    const fourthStandardMenu = await request("POST", "/api/menus", {
      token: standardToken,
      tenant: standardTenant,
      body: { title: "Menú estándar 4" },
    });
    assert.equal(fourthStandardMenu.status, 403);
    assert.equal(
      fourthStandardMenu.body.details.code,
      "STANDARD_PLAN_MENU_LIMIT"
    );
    ok("cuarto menú Client rechazado");

    const deletedStandardMenu = await request(
      "DELETE",
      `/api/menus/${standardMenuIds[0]}`,
      { token: standardToken, tenant: standardTenant }
    );
    assert.equal(deletedStandardMenu.status, 204);

    const standardReplacement = await request("POST", "/api/menus", {
      token: standardToken,
      tenant: standardTenant,
      body: { title: "Menú estándar reemplazo" },
    });
    assert.equal(standardReplacement.status, 201);
    ok("Client puede reemplazar un menú desactivado");

    const standardReactivation = await request(
      "PUT",
      `/api/menus/${standardMenuIds[0]}`,
      {
        token: standardToken,
        tenant: standardTenant,
        body: { active: true },
      }
    );
    assert.equal(standardReactivation.status, 403);
    assert.equal(
      standardReactivation.body.details.code,
      "STANDARD_PLAN_MENU_LIMIT"
    );
    ok("Client no puede reactivar un cuarto menú");

    const adminRegistration = await request(
      "POST",
      "/api/auth/register-free",
      {
        body: {
          ...registrationBody,
          email: `admin-e2e-${suffix}@example.com`,
          name: "Admin",
        },
      }
    );
    assert.equal(adminRegistration.status, 201);
    await sequelize.query(
      `INSERT INTO roles (role, active, createdAt, updatedAt)
       VALUES ('Admin', 1, NOW(), NOW())
       ON DUPLICATE KEY UPDATE active = 1, updatedAt = NOW()`
    );
    await sequelize.query(
      `UPDATE users
       SET roleId = (SELECT id FROM roles WHERE role = 'Admin' LIMIT 1),
           updatedAt = NOW()
       WHERE id = :userId`,
      { replacements: { userId: adminRegistration.body.user.id } }
    );

    const adminLogin = await request("POST", "/api/auth/login", {
      body: {
        email: adminRegistration.body.user.email,
        password: registrationBody.password,
      },
    });
    assert.equal(adminLogin.status, 200);
    assert.deepEqual(adminLogin.body.account.limits, {
      menus: null,
      categoriesPerMenu: null,
      itemsPerMenu: null,
      images: true,
    });

    for (let index = 1; index <= 4; index += 1) {
      const adminMenu = await request("POST", "/api/menus", {
        token: adminLogin.body.token,
        tenant: adminRegistration.body.user.subdomain,
        body: { title: `Menú Admin ${index}` },
      });
      assert.equal(adminMenu.status, 201);
    }
    ok("Admin conserva límites ilimitados y puede crear más de 3 menús");

    const userRoleRegistration = await request(
      "POST",
      "/api/auth/register-free",
      {
        body: {
          ...registrationBody,
          email: `user-role-e2e-${suffix}@example.com`,
          name: "UserRole",
        },
      }
    );
    assert.equal(userRoleRegistration.status, 201);
    await sequelize.query(
      `INSERT INTO roles (role, active, createdAt, updatedAt)
       VALUES ('User', 1, NOW(), NOW())
       ON DUPLICATE KEY UPDATE active = 1, updatedAt = NOW()`
    );
    await sequelize.query(
      `UPDATE users
       SET roleId = (SELECT id FROM roles WHERE role = 'User' LIMIT 1),
           updatedAt = NOW()
       WHERE id = :userId`,
      { replacements: { userId: userRoleRegistration.body.user.id } }
    );

    const userRoleLogin = await request("POST", "/api/auth/login", {
      body: {
        email: userRoleRegistration.body.user.email,
        password: registrationBody.password,
      },
    });
    assert.equal(userRoleLogin.status, 200);
    assert.deepEqual(userRoleLogin.body.account.limits, {
      menus: null,
      categoriesPerMenu: null,
      itemsPerMenu: null,
      images: true,
    });

    for (let index = 1; index <= 4; index += 1) {
      const userRoleMenu = await request("POST", "/api/menus", {
        token: userRoleLogin.body.token,
        tenant: userRoleRegistration.body.user.subdomain,
        body: { title: `Menú User ${index}` },
      });
      assert.equal(userRoleMenu.status, 201);
    }
    ok("User conserva límites ilimitados y puede crear más de 3 menús");

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

    console.log("\nE2E de planes aprobado: HTTP real + MySQL");
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
