import assert from "node:assert/strict";
import { registerFreeSchema } from "../validations/auth.validation";
import {
  assertCategoryCreationWithinPlan,
  assertImageMutationWithinPlan,
  assertItemCreationWithinPlan,
  assertMenuCreationWithinPlan,
  entitlementsForPlan,
  entitlementsForRoleName,
  isAdminRoleName,
  isClientRoleName,
  planFromRoleName,
} from "../policies/accountPolicy";
import { ApiError } from "../utils/ApiError";
import { generateToken, verifyToken } from "../utils/jwt";
import {
  requireAdminForRoleChange,
  requireSelfOrAdmin,
} from "../middlewares/authorization";
import { logger } from "../utils/logger";
import { RequestLogger } from "../utils/requestLogger";
import { getHttpStatusForError } from "../utils/errorClassification";

type TestCase = { name: string; run: () => void | Promise<void> };
const tests: TestCase[] = [];

function test(name: string, run: TestCase["run"]) {
  tests.push({ name, run });
}

function expectPolicyError(run: () => void, code: string) {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.statusCode, 403);
    assert.equal(error.details?.code, code);
    return true;
  });
}

function fakeResponse() {
  return {
    statusCode: 200,
    body: undefined as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
}

test("el registro Free normaliza email y celular vacío", () => {
  const result = registerFreeSchema.parse({
    name: " Ana ",
    lastName: " Pérez ",
    email: " ANA@EXAMPLE.COM ",
    cel: "   ",
    password: "Clave123",
    confirmationPassword: "Clave123",
  });

  assert.equal(result.name, "Ana");
  assert.equal(result.email, "ana@example.com");
  assert.equal(result.cel, null);
});

test("el registro Free no acepta roleId ni campos de privilegios", () => {
  const result = registerFreeSchema.safeParse({
    name: "Ana",
    lastName: "Pérez",
    email: "ana@example.com",
    password: "Clave123",
    confirmationPassword: "Clave123",
    roleId: 1,
  });

  assert.equal(result.success, false);
});

test("el registro Free exige confirmación de contraseña", () => {
  const result = registerFreeSchema.safeParse({
    name: "Ana",
    lastName: "Pérez",
    email: "ana@example.com",
    password: "Clave123",
    confirmationPassword: "Otra123",
  });

  assert.equal(result.success, false);
});

test("el rol Free se reconoce sin depender de mayúsculas", () => {
  assert.equal(planFromRoleName("FREE"), "free");
  assert.equal(planFromRoleName("Client"), "standard");
});

test("Free permite 1 menú y estándar permite 3", () => {
  assert.doesNotThrow(() => assertMenuCreationWithinPlan("free", 0));
  expectPolicyError(
    () => assertMenuCreationWithinPlan("free", 1),
    "FREE_PLAN_MENU_LIMIT"
  );
  assert.doesNotThrow(() => assertMenuCreationWithinPlan("standard", 2));
  expectPolicyError(
    () => assertMenuCreationWithinPlan("standard", 3),
    "STANDARD_PLAN_MENU_LIMIT"
  );
});

test("Free puede crear hasta 3 categorías por menú", () => {
  assert.doesNotThrow(() =>
    assertCategoryCreationWithinPlan("free", 2, 1)
  );
  expectPolicyError(
    () => assertCategoryCreationWithinPlan("free", 3, 1),
    "FREE_PLAN_CATEGORY_LIMIT"
  );
  assert.doesNotThrow(() =>
    assertCategoryCreationWithinPlan("standard", 100, 50)
  );
});

test("Free puede llegar a 20 ítems pero no superar el límite", () => {
  assert.doesNotThrow(() => assertItemCreationWithinPlan("free", 19, 1));
  expectPolicyError(
    () => assertItemCreationWithinPlan("free", 20, 1),
    "FREE_PLAN_ITEM_LIMIT"
  );
  expectPolicyError(
    () => assertItemCreationWithinPlan("free", 18, 3),
    "FREE_PLAN_ITEM_LIMIT"
  );
  assert.doesNotThrow(() =>
    assertItemCreationWithinPlan("standard", 100, 50)
  );
});

test("Free no puede crear o reemplazar imágenes", () => {
  expectPolicyError(
    () => assertImageMutationWithinPlan("free", true),
    "FREE_PLAN_IMAGES_DISABLED"
  );
  assert.doesNotThrow(() => assertImageMutationWithinPlan("free", false));
  assert.doesNotThrow(() => assertImageMutationWithinPlan("standard", true));
});

test("las capacidades Free son estables para el frontend", () => {
  assert.deepEqual(entitlementsForPlan("free"), {
    plan: "free",
    limits: {
      menus: 1,
      categoriesPerMenu: 3,
      itemsPerMenu: 20,
      images: false,
    },
  });
});

test("las capacidades estándar informan el límite de 3 menús", () => {
  assert.deepEqual(entitlementsForPlan("standard"), {
    plan: "standard",
    limits: {
      menus: 3,
      categoriesPerMenu: null,
      itemsPerMenu: null,
      images: true,
    },
  });
});

test("solo el rol Client recibe el límite estándar de 3 menús", () => {
  assert.equal(isClientRoleName(" CLIENT "), true);
  assert.deepEqual(entitlementsForRoleName("Client"), {
    plan: "standard",
    limits: {
      menus: 3,
      categoriesPerMenu: null,
      itemsPerMenu: null,
      images: true,
    },
  });
});

test("Admin conserva capacidades sin límites", () => {
  assert.equal(isAdminRoleName(" ADMIN "), true);
  assert.deepEqual(entitlementsForRoleName("Admin"), {
    plan: "standard",
    limits: {
      menus: null,
      categoriesPerMenu: null,
      itemsPerMenu: null,
      images: true,
    },
  });
});

test("User conserva capacidades sin límites", () => {
  assert.deepEqual(entitlementsForRoleName("User"), {
    plan: "standard",
    limits: {
      menus: null,
      categoriesPerMenu: null,
      itemsPerMenu: null,
      images: true,
    },
  });
});

test("un usuario común no puede acceder al ID de otro usuario", () => {
  const response = fakeResponse();
  let nextCalled = false;
  requireSelfOrAdmin(
    {
      params: { id: "9" },
      user: { sub: "7", roleId: 1, role: "Free" },
    } as any,
    response as any,
    () => {
      nextCalled = true;
    }
  );

  assert.equal(nextCalled, false);
  assert.equal(response.statusCode, 403);
  assert.equal(response.body.details.code, "USER_ACCESS_DENIED");
});

test("un usuario Free no puede quitarse el rol Free", () => {
  const response = fakeResponse();
  let nextCalled = false;
  requireAdminForRoleChange(
    {
      body: { roleId: 999 },
      user: { sub: "7", roleId: 1, role: "Free" },
    } as any,
    response as any,
    () => {
      nextCalled = true;
    }
  );

  assert.equal(nextCalled, false);
  assert.equal(response.statusCode, 403);
  assert.equal(response.body.details.code, "ROLE_CHANGE_DENIED");
});

test("un usuario puede actualizar su perfil si no cambia el rol", () => {
  const response = fakeResponse();
  let nextCalled = false;
  requireSelfOrAdmin(
    {
      params: { id: "7" },
      user: { sub: "7", roleId: 1, role: "Free" },
    } as any,
    response as any,
    () => {
      nextCalled = true;
    }
  );

  assert.equal(nextCalled, true);
  assert.equal(response.statusCode, 200);
});

test("JWT rechaza configuración débil y conserva accountType", () => {
  const previousSecret = process.env.JWT_SECRET;
  try {
    process.env.JWT_SECRET = "short";
    assert.throws(() => generateToken({ sub: "1" }), /al menos 32/);

    process.env.JWT_SECRET = "test-secret-with-at-least-32-characters";
    const token = generateToken({ sub: "7", accountType: "free" });
    const payload = verifyToken(token) as {
      sub?: string;
      accountType?: string;
    };
    assert.equal(payload.sub, "7");
    assert.equal(payload.accountType, "free");
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test("el logger redacta secretos y enmascara emails", () => {
  const originalError = console.error;
  const lines: string[] = [];
  console.error = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };

  try {
    logger.error("Sensitive log test", {
      password: "NeverLogThisPassword",
      token: "NeverLogThisToken",
      authorization: "Bearer NeverLogThisAuthorization",
      email: "ana@example.com",
      nested: { resetUrl: "https://example.com/reset/private-token" },
      error: new Error(
        "Provider failed for raw@example.com with Bearer EmbeddedSecret at https://example.com/callback?token=QuerySecret"
      ),
    });
  } finally {
    console.error = originalError;
  }

  const output = lines.join("\n");
  assert.ok(output.includes("[REDACTED]"));
  assert.ok(output.includes("an***@example.com"));
  assert.equal(output.includes("NeverLogThisPassword"), false);
  assert.equal(output.includes("NeverLogThisToken"), false);
  assert.equal(output.includes("NeverLogThisAuthorization"), false);
  assert.equal(output.includes("private-token"), false);
  assert.equal(output.includes("ana@example.com"), false);
  assert.equal(output.includes("raw@example.com"), false);
  assert.equal(output.includes("EmbeddedSecret"), false);
  assert.equal(output.includes("QuerySecret"), false);
});

test("los rechazos esperables se clasifican sin duplicar el fallo", () => {
  const request = {
    method: "POST",
    path: "/api/items",
    user: { sub: "7", role: "Free" },
  } as any;
  const rejection = new ApiError("Límite alcanzado", 403, {
    code: "FREE_PLAN_ITEM_LIMIT",
  });
  const originalWarn = console.warn;
  console.warn = () => undefined;

  try {
    new RequestLogger(request).failure(
      "Item creation rejected",
      rejection
    );
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(getHttpStatusForError(rejection), 403);
  assert.equal(request.failureLogged, true);
});

test("el request conserva la ruta completa para el log de finalización", () => {
  const request = {
    method: "POST",
    path: "/api/items",
    baseUrl: "",
  } as any;

  new RequestLogger(request);
  request.baseUrl = "/api/items";
  request.route = { path: "/" };
  new RequestLogger(request);
  request.baseUrl = "";

  assert.equal(request.logRoute, "/api/items/");
});

async function main() {
  let passed = 0;
  for (const current of tests) {
    try {
      await current.run();
      passed += 1;
      console.log(`✓ ${current.name}`);
    } catch (error) {
      console.error(`✗ ${current.name}`);
      throw error;
    }
  }

  console.log(`\n${passed}/${tests.length} pruebas aprobadas`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
