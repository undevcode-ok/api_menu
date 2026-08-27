# Integración frontend — cuentas Free

## Registro público

`POST /api/auth/register-free`

No requiere token ni header de tenant.

Body JSON:

```json
{
  "name": "Ana",
  "lastName": "Pérez",
  "email": "ana@example.com",
  "cel": "+54 11 1234 5678",
  "password": "Clave123",
  "confirmationPassword": "Clave123"
}
```

No enviar `roleId`, `active`, `accountType` ni `plan`. El endpoint es estricto y
el backend siempre asigna el rol `Free`.

Respuesta `201`:

```json
{
  "message": "Cuenta Free creada correctamente",
  "token": "<jwt>",
  "user": {
    "id": 25,
    "name": "Ana",
    "lastName": "Pérez",
    "email": "ana@example.com",
    "cel": "+54 11 1234 5678",
    "roleId": 4,
    "active": true,
    "subdomain": "ana-perez"
  },
  "account": {
    "plan": "free",
    "limits": {
      "menus": 1,
      "categoriesPerMenu": 3,
      "itemsPerMenu": 10,
      "images": false
    }
  }
}
```

Guardar `token`, `user` y `account`. Para las rutas del tenant enviar:

```http
Authorization: Bearer <jwt>
x-tenant-subdomain: <user.subdomain>
```

## Sesión y capacidades

`POST /api/auth/login` devuelve también el objeto `account` anterior.

`GET /api/auth/me` requiere `Authorization: Bearer <jwt>` y devuelve los datos
actualizados del usuario y sus capacidades:

```json
{
  "user": {},
  "account": {
    "plan": "free",
    "limits": {
      "menus": 1,
      "categoriesPerMenu": 3,
      "itemsPerMenu": 10,
      "images": false
    }
  }
}
```

Usar `/api/auth/me` al restaurar una sesión. El frontend puede ocultar o
deshabilitar controles según `account.limits`, pero el backend sigue siendo la
fuente de verdad.

## Comportamiento de la interfaz

- Si `account.limits.images === false`, ocultar selectores de archivos, campos
  de URL de imagen, logo y fondo.
- Si la cantidad de menús activos llegó a `account.limits.menus`, deshabilitar
  “Crear menú”. Si elimina o desactiva un menú puede crear otro, sin superar
  simultáneamente el límite informado (1 para Free y 3 para Client).
- Si la cantidad de categorías del menú llegó a
  `account.limits.categoriesPerMenu`, deshabilitar “Agregar categoría” y
  advertir antes de importar un CSV que cree categorías nuevas. En Free el
  límite es 3; en estándar es `null`.
- Contar todos los ítems de todas las categorías del menú. Al llegar a
  `account.limits.itemsPerMenu`, deshabilitar “Agregar ítem” y advertir antes de
  importar un CSV que exceda el espacio restante.
- Un límite con valor `null` significa ilimitado.
- No decidir permisos leyendo `roleId`. Usar exclusivamente `account.plan` y
  `account.limits` para la presentación.

Para una cuenta paga con rol `Client` (rol 2 en producción),
`account.limits` es:

```json
{
  "menus": 3,
  "categoriesPerMenu": null,
  "itemsPerMenu": null,
  "images": true
}
```

Para una cuenta con rol `Admin`, todos los límites son ilimitados. Se mantiene
`plan: "standard"` por compatibilidad y el frontend debe guiarse por `limits`:

```json
{
  "menus": null,
  "categoriesPerMenu": null,
  "itemsPerMenu": null,
  "images": true
}
```

El rol `User` tampoco recibe el límite comercial de menús. Su respuesta de
límites es igual a la de Admin. El límite de 3 menús se aplica exclusivamente
al rol cuyo nombre es `Client`; el frontend no debe inferirlo por un `roleId`
fijo y siempre debe usar `account.limits.menus`.

## Errores de límites

Los límites devuelven HTTP `403`. Leer `error.response.data.details.code`:

| Código | Significado |
| --- | --- |
| `FREE_PLAN_MENU_LIMIT` | Ya existe el único menú permitido. |
| `FREE_PLAN_CATEGORY_LIMIT` | La operación superaría 3 categorías en el menú. |
| `FREE_PLAN_ITEM_LIMIT` | La operación superaría 10 ítems en el menú. |
| `FREE_PLAN_IMAGES_DISABLED` | Se intentó crear, vincular o reemplazar una imagen. |
| `STANDARD_PLAN_MENU_LIMIT` | La operación superaría 3 menús activos. |
| `TENANT_ACCESS_DENIED` | El subdominio no pertenece al usuario autenticado. |
| `ROLE_CHANGE_DENIED` | Un usuario no administrador intentó cambiar su rol. |

Ejemplo:

```json
{
  "message": "El plan Free permite hasta 10 ítems por menú.",
  "statusCode": 403,
  "details": {
    "code": "FREE_PLAN_ITEM_LIMIT",
    "plan": "free",
    "limit": 10,
    "current": 10,
    "requested": 1
  }
}
```

Ante esos códigos, mantener la pantalla actual, mostrar una notificación y
ofrecer el flujo de mejora de plan si existe. Nunca reintentar automáticamente.

## Casos de registro a manejar

- `400`: campos inválidos, contraseñas distintas o campos no permitidos.
- `409` + `EMAIL_ALREADY_IN_USE`: el email ya tiene una cuenta.
- `201`: iniciar sesión directamente con el JWT recibido.

La contraseña debe tener entre 8 y 16 caracteres.
