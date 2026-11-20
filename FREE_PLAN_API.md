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
      "itemsPerMenu": 20,
      "images": true
    },
    "imagePolicy": {
      "lifetimeUploadLimit": 20,
      "uploadsUsed": 0,
      "uploadsRemaining": 20,
      "maxFileSizeBytes": 5242880,
      "allowedMimeTypes": [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp"
      ],
      "allowedExtensions": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
      "scope": "items",
      "acceptsExternalUrls": false,
      "deletionRestoresQuota": false
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
      "itemsPerMenu": 20,
      "images": true
    },
    "imagePolicy": {
      "lifetimeUploadLimit": 20,
      "uploadsUsed": 0,
      "uploadsRemaining": 20,
      "maxFileSizeBytes": 5242880,
      "allowedMimeTypes": [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp"
      ],
      "allowedExtensions": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
      "scope": "items",
      "acceptsExternalUrls": false,
      "deletionRestoresQuota": false
    }
  }
}
```

Usar `/api/auth/me` al restaurar una sesión. El frontend puede ocultar o
deshabilitar controles según `account.limits`, pero el backend sigue siendo la
fuente de verdad.

## Imágenes de platos para Free

Free puede subir archivos solamente mediante:

`PUT /api/images/items/:itemId`

Headers:

```http
Authorization: Bearer <jwt>
x-tenant-subdomain: <user.subdomain>
Content-Type: multipart/form-data
```

En navegador no establecer manualmente `Content-Type`: al enviar `FormData`,
`fetch` o Axios debe agregar automáticamente el `boundary` multipart.

El formulario debe incluir:

- `payload`: JSON serializado con el array `images`.
- Una parte de archivo por cada `fileField`, usando exactamente el mismo nombre.

Ejemplo de `payload`:

```json
{
  "images": [
    {
      "fileField": "dishImage0",
      "alt": "Hamburguesa completa",
      "sortOrder": 0,
      "active": true
    }
  ]
}
```

La parte binaria debe llamarse `dishImage0`. Se aceptan JPEG/JPG, PNG, GIF y
WebP, con un máximo de `5242880` bytes (5 MiB) por archivo. El MIME, la extensión
y el contenido real son validados por el backend y la imagen se convierte a
WebP antes de guardarse.

Respuesta `200`:

```json
{
  "ok": true,
  "account": {
    "plan": "free",
    "limits": {
      "menus": 1,
      "categoriesPerMenu": 3,
      "itemsPerMenu": 20,
      "images": true
    },
    "imagePolicy": {
      "lifetimeUploadLimit": 20,
      "uploadsUsed": 1,
      "uploadsRemaining": 19,
      "maxFileSizeBytes": 5242880,
      "allowedMimeTypes": [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp"
      ],
      "allowedExtensions": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
      "scope": "items",
      "acceptsExternalUrls": false,
      "deletionRestoresQuota": false
    }
  }
}
```

Cada archivo subido exitosamente consume una carga. Reemplazar una imagen con
otro archivo también consume otra carga. Borrar una imagen no reduce
`uploadsUsed` ni aumenta `uploadsRemaining`.

Para borrar una imagen existente se puede enviar JSON o multipart sin archivo:

```json
{
  "images": [{ "id": 123, "_delete": true }]
}
```

Para cambiar solamente `alt`, `sortOrder` o `active`, enviar el `id` y los
campos a modificar sin `url` ni `fileField`; no consume cuota.

Free no puede enviar `url`, subir logos/fondos de menú ni usar el CRUD genérico
de imágenes para crear o reemplazar URLs. Client, Admin y User conservan el
comportamiento existente sin cuota histórica.

## Comportamiento de la interfaz

- Si `account.imagePolicy.scope === "items"`, mostrar el selector de archivo
  solamente en platos y ocultar campos de URL, logo y fondo.
- Mostrar `uploadsUsed / lifetimeUploadLimit` y deshabilitar nuevas cargas
  cuando `uploadsRemaining === 0`. No incrementar ni devolver cupo al borrar;
  reemplazar una imagen consume una carga nueva.
- Validar tamaño, MIME y extensión antes de enviar, pero siempre procesar los
  errores del backend como fuente de verdad.
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
- No decidir permisos leyendo `roleId`. Usar `account.plan`, `account.limits` y
  `account.imagePolicy` para la presentación.

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

En Client, Admin y User, `account.imagePolicy.lifetimeUploadLimit`,
`uploadsUsed` y `uploadsRemaining` son `null`, `scope` es `"all"` y
`acceptsExternalUrls` es `true`.

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

Los límites de plan devuelven HTTP `403`; los archivos inválidos devuelven
HTTP `400`. Leer `error.response.data.details.code`:

| Código | Significado |
| --- | --- |
| `FREE_PLAN_MENU_LIMIT` | Ya existe el único menú permitido. |
| `FREE_PLAN_CATEGORY_LIMIT` | La operación superaría 3 categorías en el menú. |
| `FREE_PLAN_ITEM_LIMIT` | La operación superaría 20 ítems en el menú. |
| `FREE_PLAN_IMAGE_SCOPE_RESTRICTED` | Free intentó usar imágenes fuera de platos/items. |
| `FREE_PLAN_IMAGE_URL_NOT_ALLOWED` | Free intentó vincular una URL externa. |
| `FREE_PLAN_IMAGE_UPLOAD_LIMIT` | La operación superaría las 20 cargas históricas. |
| `IMAGE_FILE_TOO_LARGE` | Algún archivo supera 5242880 bytes. |
| `IMAGE_FILE_COUNT_LIMIT` | Se enviaron más de 20 archivos en una solicitud. |
| `IMAGE_FILE_TYPE_NOT_ALLOWED` | El MIME declarado no está permitido. |
| `IMAGE_FILE_EXTENSION_NOT_ALLOWED` | La extensión no está permitida. |
| `IMAGE_FILE_CONTENT_INVALID` | El contenido no es realmente una imagen procesable. |
| `IMAGE_FILE_MISSING` | Un `fileField` no tiene su parte binaria correspondiente. |
| `IMAGE_FILE_UNREFERENCED` | Llegó un archivo que no figura en el `payload`. |
| `IMAGE_FILE_REFERENCE_DUPLICATED` | Dos entradas reutilizan el mismo `fileField`. |
| `IMAGE_FILE_FIELD_DUPLICATED` | Llegaron dos archivos con el mismo nombre de campo. |
| `STANDARD_PLAN_MENU_LIMIT` | La operación superaría 3 menús activos. |
| `TENANT_ACCESS_DENIED` | El subdominio no pertenece al usuario autenticado. |
| `ROLE_CHANGE_DENIED` | Un usuario no administrador intentó cambiar su rol. |

Ejemplo:

```json
{
  "message": "El plan Free permite hasta 20 ítems por menú.",
  "statusCode": 403,
  "details": {
    "code": "FREE_PLAN_ITEM_LIMIT",
    "plan": "free",
    "limit": 20,
    "current": 20,
    "requested": 1
  }
}
```

Ante esos códigos, mantener la pantalla actual, mostrar una notificación y
ofrecer el flujo de mejora de plan si existe. Nunca reintentar automáticamente.

Ejemplo al intentar la carga histórica 21:

```json
{
  "message": "El plan Free permite hasta 20 cargas de imágenes en total. Borrar una imagen no recupera el cupo.",
  "statusCode": 403,
  "details": {
    "code": "FREE_PLAN_IMAGE_UPLOAD_LIMIT",
    "plan": "free",
    "limit": 20,
    "current": 20,
    "requested": 1,
    "remaining": 0,
    "deletionRestoresQuota": false
  }
}
```

## Casos de registro a manejar

- `400`: campos inválidos, contraseñas distintas o campos no permitidos.
- `409` + `EMAIL_ALREADY_IN_USE`: el email ya tiene una cuenta.
- `201`: iniciar sesión directamente con el JWT recibido.

La contraseña debe tener entre 8 y 16 caracteres.
