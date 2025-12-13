
# Backend API – MVP Plataforma de Votación

Este módulo implementa la capa **Web2** del MVP de votaciones. Gestiona autenticación tradicional, padrón electoral y la vinculación de billeteras Web3 antes de interactuar con los smart contracts del módulo `smart-contracts`. La prioridad es la velocidad de desarrollo y la claridad de flujos; se omiten pruebas automatizadas y mecanismos de seguridad avanzados conforme a los lineamientos del MVP.

---

## Arquitectura y responsabilidades

| Componente | Rol | Detalles |
|------------|-----|----------|
| **Express.js** | Servidor HTTP | Expone endpoints REST sobre `/api` para registro/login y acciones del padrón. |
| **Sequelize + PostgreSQL** | Almacenamiento relacional | Define el modelo `User` (padrón electoral) y persiste credenciales, estado `is_verified` y `wallet_address`. |
| **JWT** | Autenticación Web2 | Genera tokens firmados que protegen rutas privadas (`/users/link-wallet`). |
| **bcryptjs** | Seguridad básica | Hashea contraseñas antes de guardar usuarios. |
| **ethers** | Integración Web3* | Preparado para conectar con los contratos (por ahora solo listado en dependencias; se usará en etapas siguientes para consultar/emitir transacciones). |

\*Aunque aún no se usa en el código, `ethers` permitirá que esta API consulte el contrato `VotingSystem` (por ejemplo para validar estado de elecciones o sincronizar resultados) aprovechando el mismo stack que el frontend.

---

## Estructura de carpetas

```
backend-api/
├─ config/
│  └─ database.js          # Inicialización de Sequelize y sincronización de modelos
├─ controllers/
│  ├─ auth.controller.js      # Registro y login Web2 con JWT
│  ├─ wallet.controller.js    # Vinculación de wallet Web3 al usuario autenticado
│  ├─ election.controller.js  # Lectura on-chain (elecciones y estado de votantes)
│  └─ admin.controller.js     # Operaciones administrativas (whitelist on-chain)
├─ middleware/
│  ├─ auth.middleware.js      # Protección de rutas (Bearer token)
│  └─ admin.middleware.js     # Valida X-Admin-Api-Key para operaciones críticas
├─ models/
│  ├─ User.js                # Definición del padrón (incluye roles user/admin)
│  └─ AdminAction.js         # Bitácora de operaciones administrativas
├─ services/
│  └─ blockchain.service.js   # Cliente ethers para leer/escribir en VotingSystem
├─ routes/
│  └─ index.js             # Tabla de rutas montadas bajo /api
├─ server.js               # Configuración del servidor Express
├─ package.json            # Scripts y dependencias
└─ .env                    # Variables de entorno (no versionado)
```

---

## Dependencias principales y uso

| Paquete | Uso en el proyecto |
|---------|-------------------|
| `express` | Framework HTTP minimalista. Maneja rutas, middlewares y respuestas JSON. |
| `cors` | Permite solicitudes desde el frontend (Next.js en `http://localhost:3000`). |
| `dotenv` | Carga variables de entorno críticas (`PORT`, credenciales DB, secretos JWT). |
| `sequelize`, `pg`, `pg-hstore` | ORM + driver PostgreSQL. Simplifican migraciones automáticas vía `sequelize.sync`. |
| `bcryptjs` | Hash de contraseñas con `salt`. Evita almacenar texto plano. |
| `jsonwebtoken` | Emisión y verificación de JWT con expiración configurable (`JWT_EXPIRATION`). |
| `ethers` | Cliente Ethereum moderno. Se usa en `blockchain.service.js` para leer elecciones, consultar votantes y autorizar whitelist vía `authorizeVoters`. |
| `nodemon` (dev) | Recarga automática del servidor durante el desarrollo. |

---

## Configuración de entorno

Crear un archivo `backend-api/.env` (no se versiona) con las variables:

```env
# Puerto del servidor Express
PORT=4000

# Configuración PostgreSQL
DB_DIALECT=postgres
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=456852
DB_NAME=voting_app
DB_PORT=5432

# Autenticación JWT
JWT_SECRET=tu_secreto_muy_largo_y_seguro_para_jwt
JWT_EXPIRATION=1h

# Origen permitido (CORS)
FRONTEND_ORIGIN=http://localhost:3000

# Integración blockchain
SMART_CONTRACT_ADDRESS=0x....        # Dirección del VotingSystem desplegado
SMART_CONTRACT_RPC_URL=http://127.0.0.1:8545
# SMART_CONTRACT_ABI_PATH=C:/ruta/completa/al/archivo/VotingSystem.json

# Operaciones admin
ADMIN_API_KEY=CAMBIA_ESTE_TOKEN_SEGURO
ADMIN_WALLET_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000
```

> Reemplaza `SMART_CONTRACT_ADDRESS`, `ADMIN_API_KEY` y `ADMIN_WALLET_PRIVATE_KEY` antes de usar los endpoints on-chain. Si no configuras estos valores el backend bloqueará las operaciones administrativas.

---

## Configuración de base de datos

Archivo: `config/database.js`

1. Carga `dotenv` y crea una instancia de `Sequelize` usando las variables anteriores.
2. Función `connectDB()`:
   - Llama a `sequelize.authenticate()` para verificar credenciales.
   - Ejecuta `sequelize.sync({ alter: true })` para crear/ajustar tablas automáticamente (útil en un MVP, aunque no recomendado para producción sin migraciones formales).
   - Detiene el proceso si la conexión falla.

> Como el enfoque es MVP, se sacrifica migración granular en favor de velocidad; en etapas siguientes se debería migrar a `sequelize-cli` o herramientas como Prisma.

---

## Modelos de datos

### `User` (@backend-api/models/User.js#8-39)

| Campo | Tipo | Reglas | Descripción |
|-------|------|--------|-------------|
| `id` | INTEGER (PK, auto-increment) | — | Identificador interno. |
| `email` | STRING | `allowNull: false`, `unique`, validación `isEmail` | Correo usado para registro Web2. |
| `password_hash` | STRING | `allowNull: false` | Hash generado con `bcrypt`. |
| `full_name` | STRING | `allowNull: false` | Nombre completo del votante. |
| `wallet_address` | STRING | `unique`, `allowNull: true` | Dirección Ethereum vinculada. Se llena después del login. |
| `role` | ENUM('user','admin') | `default: user` | Define si un usuario puede ejecutar operaciones administrativas además de autenticarse con JWT. |
| `is_verified` | BOOLEAN | `defaultValue: false` | Bandera para habilitar el voto (en el MVP se setea `true` al crear). |

La tabla usa `timestamps` para auditar creación/actualización. Este modelo constituye el **padrón electoral on-premise**, que el backend empleará para sincronizar con la whitelist del contrato `VotingSystem`.

---

## Controladores y lógica de negocio

### `auth.controller.js`
1. **`registerUser`**
   - Valida `email`, `password`, `full_name`.
   - Verifica unicidad por email.
   - Genera `password_hash` con `bcrypt`.
   - Inserta registro con `is_verified: true` (asumimos verificación inmediata en el MVP).
   - Devuelve JWT + datos básicos del usuario.
2. **`loginUser`**
   - Busca usuario por email.
   - Compara password con `bcrypt.compare`.
   - Devuelve perfil (incluida `wallet_address` si ya fue vinculada) y nuevo JWT.

La función `generateToken` usa `JWT_SECRET` y `JWT_EXPIRATION` para firmar tokens con payload mínimo (`{ id }`), priorizando simplicidad.

### `wallet.controller.js`
1. **`linkWallet`**
   - Ruta protegida; requiere `req.user` del middleware.
   - Valida `wallet_address` (string en formato `0x...` de 42 caracteres).
   - Verifica que la wallet no esté asociada a otro usuario.
   - Actualiza el usuario autenticado con su dirección y responde con confirmación.
   - Esta etapa es crítica antes de enviar cualquier transacción Web3 desde frontend, ya que la wallet vinculada se usará para verificar elegibilidad.

### `election.controller.js`
1. **`getElectionById`**
   - Usa `blockchain.service` para llamar `getElection`.
   - Normaliza el payload con título, descripción, tiempos, opciones y conteo de votos.
2. **`getVoterStatus`**
   - Consulta `isAuthorized` y `hasAccountVoted` para una wallet dada.

### `admin.controller.js`
1. **`authorizeElectionVoters`**
   - Recibe `voter_addresses` (array) y llama a `authorizeVoters` on-chain usando la private key configurada.
   - Regresa hash de transacción, bloque y la lista autorizada para auditoría.
   - Registra la operación (o el fallo) en `AdminAction` incluyendo `voter_addresses`, hash y bloque.

### Middleware `auth.middleware.js`
- Inspecciona la cabecera `Authorization: Bearer <token>`.
- Verifica la firma mediante `jwt.verify`.
- Busca el usuario en la base y lo adjunta a `req.user` (excluyendo `password_hash`).
- Responde con 401 cuando falta token, caducó o el usuario no existe.

### Middleware `admin.middleware.js`
- Verifica el header `X-Admin-Api-Key`.
- Exige también autenticación JWT (`protect`) y que `req.user.role === 'admin'`.
- Permite opcionalmente pasar `X-Admin-Identity` para que quede registrado en la bitácora.
- Si la API key coincide con `ADMIN_API_KEY`, permite continuar; de lo contrario responde 401.
- Si el valor en `.env` sigue siendo el placeholder, responde 500 para forzar la configuración correcta.

---

## Rutas / Endpoints

Archivo: `routes/index.js`. Todas se montan bajo `/api`.

| Método | Endpoint | Middleware | Controlador | Descripción |
|--------|----------|------------|-------------|-------------|
| `POST` | `/auth/register` | — | `registerUser` | Alta de votante Web2 con hash de contraseña y JWT de bienvenida. |
| `POST` | `/auth/login` | — | `loginUser` | Autenticación con email/password. Retorna JWT y datos del padrón. |
| `PATCH` | `/users/link-wallet` | `protect` | `linkWallet` | Vincula una wallet Ethereum al usuario autenticado. |
| `GET` | `/elections/:id` | — | `getElectionById` | Lee on-chain los datos de una elección. |
| `GET` | `/elections/:id/voters/:address` | — | `getVoterStatus` | Verifica si una wallet está autorizada o ya votó. |
| `POST` | `/admin/elections/:id/authorize` | `protect` + `adminGuard` | `authorizeElectionVoters` | Sincroniza whitelist invocando `authorizeVoters` on-chain y registra la acción en la bitácora. |
| `GET` | `/admin/actions` | `protect` + `adminGuard` | `listAdminActions` | Consulta la bitácora con filtros opcionales `action_type`, `election_id`, `from`, `to`, `page`, `limit`. |

> Si `ADMIN_API_KEY` o `ADMIN_WALLET_PRIVATE_KEY` no están configurados correctamente, el endpoint admin responderá con error.

---

## Integración con el módulo Smart Contracts

1. **Dirección del contrato**: el script `deploy-voting.ts` imprime el address del `VotingSystem`. Debe copiarse a `SMART_CONTRACT_ADDRESS` para que backend y frontend apunten al mismo contrato.
2. **`services/blockchain.service.js`**:
   - Inicializa un `ethers.JsonRpcProvider` usando `SMART_CONTRACT_RPC_URL`.
   - Carga el ABI desde `smart-contracts/artifacts/...` o desde `SMART_CONTRACT_ABI_PATH`.
   - Expone métodos de lectura (`fetchElectionById`, `fetchVoterStatus`) y escritura (`authorizeWhitelist`) firmados con la private key admin.
3. **Sincronización de whitelist**:
   - Backend valida identidades Web2 y, cuando el admin lo aprueba, invoca `/api/admin/elections/:id/authorize` con la lista `voter_addresses`.
   - El servicio firma la transacción `authorizeVoters` y devuelve hash/bloque para trazabilidad.
4. **Frontend**:
   - El cliente Next.js primero golpeará este backend (`/auth/login`, `/users/link-wallet`) para construir el padrón local.
   - Luego interactúa directamente con el smart contract usando la wallet vinculada; este backend actúa como puente para lecturas rápidas y operaciones admin centralizadas.

---

## Configuración del servidor

Archivo: `server.js`

1. Carga `dotenv` y determina `PORT` (default 4000).
2. Llama a `connectDB()` antes de aceptar solicitudes.
3. Configura `cors` permitiendo únicamente `http://localhost:3000` (frontend Next.js).
4. Habilita `express.json()` para parsear cuerpos JSON.
5. Monta las rutas en `/api`.
6. Expone un endpoint raíz `/` como health check informal.

> Si necesitas aceptar múltiples orígenes o desplegar en producción, ajusta la configuración de CORS y las variables de entorno según el dominio real.

---

## Guía de uso

1. **Instalación**
   ```bash
   cd backend-api
   npm install
   ```
2. **Preparar PostgreSQL**
   - Crear la base `voting_app`.
   - Asegurarse de que el usuario/contraseña coinciden con `.env`.
3. **Iniciar en modo desarrollo**
   ```bash
   npm run dev  # nodemon server.js
   ```
4. **Probar endpoints básicos** (ejemplo con `curl`):
   ```bash
   curl -X POST http://localhost:4000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"demo@example.com","password":"123456","full_name":"Demo User"}'
   ```
   Guardar el `token` de respuesta y usarlo en:
   ```bash
   curl -X PATCH http://localhost:4000/api/users/link-wallet \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"wallet_address":"0xabc123abc123abc123abc123abc123abc123abc1"}'
   ```

5. **Consultar elecciones on-chain**
   ```bash
   curl http://localhost:4000/api/elections/1
   ```

6. **Autorizar whitelist (requiere valores reales en .env)**
   ```bash
   curl -X POST http://localhost:4000/api/admin/elections/1/authorize \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <TOKEN_ADMIN>" \
     -H "X-Admin-Api-Key: <TU_API_KEY>" \
     -H "X-Admin-Identity: <TU_NOMBRE>" \
     -d '{"voter_addresses":["0x1111111111111111111111111111111111111111","0x2222..."]}'
   ```

7. **Consultar bitácora admin**
   ```bash
   curl "http://localhost:4000/api/admin/actions?action_type=AUTHORIZE_WHITELIST&page=1&limit=10" \
     -H "Authorization: Bearer <TOKEN_ADMIN>" \
     -H "X-Admin-Api-Key: <TU_API_KEY>"
   ```

> Para crear un administrador, puedes promover manualmente un registro en la tabla `users` (columna `role`) o añadir una ruta interna de seeding. Asegúrate de que esa cuenta esté protegida y que su JWT se use únicamente en ambientes seguros.

---

## Roadmap sugerido

1. **Integración directa con smart contracts** usando `ethers` para:
   - Consultar elecciones y reflejarlas en el backend (cache).
   - Actualizar whitelist desde la API cuando un admin apruebe votantes.
2. **Roles y permisos**:
   - Introducir campo `role` (admin/user) y aplicar middleware adicional.
3. **Persistencia de auditoría**:
   - Log de operaciones críticas (registro, login, vinculación).
4. **Hardening**:
   - Reemplazar `sequelize.sync({ alter: true })` por migraciones versionadas.
   - Implementar rate limiting y validaciones más estrictas si el MVP evoluciona.

Con esta documentación tienes una visión completa del módulo backend, cómo se articula con la infraestructura Web3 y qué pasos siguen para integrarlo totalmente con el frontend y los smart contracts del proyecto.
