# Pedidos por WhatsApp

Cada menú puede configurar su propio `whatsappPhone`. Es un número público del negocio, independiente del celular privado de la cuenta. Todos los planes pueden usarlo.

## Puesta en marcha

1. Compilar y reiniciar primero el backend (`npm run build`, `npm start`). Al iniciar, se agrega automáticamente `menus.whatsappPhone` si falta. La migración es aditiva e idempotente; conserva los datos existentes. El usuario de MySQL necesita permiso para agregar esa columna. Los menús existentes quedan con `NULL`, sin pedidos habilitados.
2. Compilar y publicar el frontend con `NEXT_PUBLIC_BASE_URL` apuntando a la API, incluyendo `/api`.
3. En **Crear menú** o **Editar información del menú**, completar **WhatsApp para recibir pedidos** y guardar. Usar código de país; por ejemplo `+54 9 11 1234 5678`. Los espacios, guiones y paréntesis se eliminan al guardar. Vaciar el campo deshabilita los pedidos.
4. Abrir el enlace público del QR, agregar productos, revisar el pedido y elegir **Enviar por WhatsApp**. El cliente debe enviar el mensaje dentro de WhatsApp. La vista previa permite probar el carrito pero no enviar.

Si las migraciones se gestionan por separado, ejecutar una vez en una base que todavía no tenga la columna:

```sql
ALTER TABLE menus ADD COLUMN whatsappPhone VARCHAR(15) NULL DEFAULT NULL;
```

El backend detectará la columna existente durante el siguiente inicio.

## API

`POST /api/menus` y `PUT /api/menus/:id` aceptan `whatsappPhone` en JSON, multipart y `payload`. Un valor vacío o `null` borra el número; omitirlo al actualizar conserva el anterior. Se mantienen la autenticación y el aislamiento por tenant existentes.

`GET /api/public/menus/:publicId` incluye `whatsappPhone`.

`POST /api/public/menus/:publicId/whatsapp-order` es público y recibe:

```json
{
  "items": [{ "itemId": 1, "quantity": 3 }, { "itemId": 2, "quantity": 1 }],
  "customerName": "Mesa 4",
  "notes": "Sin picante"
}
```

Máximos: 50 productos distintos, 99 unidades por producto, 80 caracteres para nombre/mesa y 500 para observaciones. No acepta precios, totales ni teléfonos del cliente. Consulta el menú activo y sus categorías/productos activos para obtener los precios y el destinatario actuales.

Devuelve `items` (con `unitPriceCents` y `subtotalCents`), `totalCents`, `hasUnpricedItems`, `message` y `whatsappUrl`. Los importes son enteros en centavos. Un precio sin definir conserva `null` y se muestra como pendiente de confirmación, no como gratuito. Si cambia un precio, el frontend muestra la cotización nueva antes de abrir WhatsApp.

Errores: `400` para pedidos inválidos, `404` para menú inexistente/inactivo y `409` para WhatsApp deshabilitado o productos que ya no están disponibles en ese menú.

Este flujo prepara un mensaje; no persiste órdenes ni afirma que el negocio las recibió o confirmó. No requiere credenciales de WhatsApp Business. El carrito se conserva en `sessionStorage`, separado por menú y por vista previa, hasta vaciarlo o finalizar la sesión del navegador.

## Verificación

- `npm test`: incluye validación de teléfonos/pedidos, cálculo y codificación del mensaje, disponibilidad y migración idempotente.
- `npm run build`: compilación TypeScript.
- `npm run test:e2e`: HTTP real con MySQL, incluyendo configuración multipart, consulta pública, pedidos, cambios de precio y disponibilidad. Exige `DB_NAME=api_menu_e2e` y recrea exclusivamente las tablas de esa base; usar una instancia de pruebas.

En el frontend, `npm test` comprueba el carrito y `npm run build` compila la aplicación.
