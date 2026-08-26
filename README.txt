# Proyecto Menú Multitenant

## 🧠 Tecnologías usadas
- Node.js (v18 o superior)
- Express
- TypeScript
- Sequelize ORM
- MySQL
- Argon2 (para hashear contraseñas)
- Zod (validación de datos)
- Dotenv (configuración por entorno)

---

## ⚙️ Qué necesitás tener instalado
1. **Node.js y npm**
   - Descargar desde https://nodejs.org/
2. **MySQL**
   - Versión 8.0+
   - Crear una base de datos vacía, por ejemplo: `menu_db`
3. **Instalar dependencias del proyecto**
   ```bash
   npm install
   ```

---

## ⚙️ Configuración
1. Crear un archivo `.env` en la raíz del proyecto con estos valores:
	PORT=3000
	DB_HOST=localhost
	DB_PORT=3306
	DB_NAME=catalogo
	DB_USER=root
	DB_PASSWORD=12345678
   ```
   Agregá también la URL pública desde donde los clientes ven los menús (se usa para construir el enlace que va dentro del QR):
   ```
	PUBLIC_MENU_BASE_URL=http://localhost:5173/menu
   ```
   Opcionalmente podés sobreescribir el servicio de QR si tenés otro endpoint:
   ```
	QR_API_ENDPOINT=https://api-qr-yz35.onrender.com/api/qr
	QR_API_TIMEOUT_MS=10000
   ```

## ▶️ Cómo correr el proyecto

### 1️ Ejecutar el seeder general
Antes de levantar el servidor, corré el seeder para generar los datos iniciales (usuarios, roles, etc):

```bash
npm run seed
```

### 2️ Modo desarrollo
```bash
npm run dev
```

### 3️ Modo producción
```bash
npm run build
npm start
```

El servidor corre en: [http://localhost:3000](http://localhost:3000)

---

## 🧩 Endpoints principales

### Usuarios
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/users` | Crear usuario (genera subdominio automático) |
| GET | `/api/users` | Listar usuarios |
| PUT | `/api/users/:id` | Actualizar usuario |
| DELETE | `/api/users/:id` | Baja lógica |

### Menús (por tenant)
> Todos los endpoints requieren el header: `x-tenant-subdomain: <subdominio>`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/menus` | Listar menús del tenant |
| GET | `/api/menus/:id` | Obtener menú por ID |
| GET | `/api/menus/:id/qr` | Generar un PNG con el QR que apunta al menú |
| POST | `/api/menus/:id/import-csv` | Importar categorías e ítems desde un CSV |
| POST | `/api/menus` | Crear nuevo menú |
| PUT | `/api/menus/:id` | Actualizar menú |
| DELETE | `/api/menus/:id` | Baja lógica (active=false) |

> El endpoint `/api/menus/:id/qr` acepta los parámetros opcionales `format` (`png`, `svg` o `webp`) y `size` (entre 128 y 1024). Devuelve por defecto la imagen en binario para que la puedas descargar o mostrar directamente en el navegador.

### Importar categorías + ítems

- Endpoint: `POST /api/menus/:id/import-csv`
- Headers: `x-tenant-subdomain: <tenant>`
- Body: `multipart/form-data` con el archivo en `file`
- Formato del CSV (encabezados obligatorios):
  ```
  type,categoryTitle,categoryActive,categoryPosition,itemTitle,itemDescription,itemPrice,itemActive,itemPosition
  category,"Pizzas",true,,,
  item,,,, "Muzzarella","Con salsa y muzza",2500,true,
  item,,,, "Napolitana","Con tomate fresco",2700,true,
  category,"Bebidas",true,,,
  item,,,, "Coca 500ml","",1500,true,
  ```
- Cada fila `category` crea una nueva categoría si el título aún no existe en el menú (si ya existe, se reutiliza). Todas las filas `item` siguientes se asignan a la última categoría definida.
- Si alguna fila viene incompleta, el endpoint continúa con las demás y devuelve el detalle de errores por fila en la respuesta.

---

## Plan Free

- Registro público: `POST /api/auth/register-free`.
- Sesión/capacidades actuales: `GET /api/auth/me`.
- Un menú activo por cuenta.
- Tres categorías como máximo por menú, incluyendo importaciones CSV.
- Diez ítems como máximo por menú, incluyendo importaciones CSV.
- No permite cargar ni vincular imágenes.

El rol Client (rol 2 en producción) permite hasta tres menús activos; las
categorías y los ítems siguen sin límite y las imágenes continúan habilitadas.
Los roles Admin y User no tienen límites de menús, categorías, ítems ni
imágenes.

El contrato completo para frontend está documentado en `FREE_PLAN_API.md`.

### Pruebas del plan Free

```bash
npm test
npm run test:e2e
```

La prueba E2E usa HTTP real y MySQL. Por seguridad se niega a ejecutarse salvo
que `DB_NAME=api_menu_e2e`; recrea únicamente las tablas de esa base.
