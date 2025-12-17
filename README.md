
# Guía de arranque del monorepo blockchain

Este documento resume qué necesitas para ejecutar por primera vez cada módulo del proyecto y cómo levantarlos en local. Sigue las secciones en orden para evitar configuraciones faltantes.

---

## Índice
1. [Requisitos globales](#requisitos-globales)
2. [smart-contracts](#smart-contracts)
3. [backend-api](#backend-api)
4. [frontend-client](#frontend-client)
5. [Flujo de pruebas integrado](#flujo-de-pruebas-integrado)

---

## Requisitos globales
- Node.js ≥ 18 (recomendado 20) y PNPM ≥ 8 (el repo usa PNPM por default).
- PostgreSQL 15+ en local con el usuario/contraseña que definas en `.env`.
- Git instalado (para gestionar el repositorio).

Estructura del monorepo:
```
blockchain/
├─ backend-api/        # API Express + Sequelize
├─ frontend-client/    # Next.js (App Router)
└─ smart-contracts/    # Hardhat + contratos VotingSystem
```

---

## smart-contracts

### 1. Configuración inicial
1. Entrar a la carpeta:
   ```bash
   cd smart-contracts
   ```
2. Instalar dependencias:
   ```bash
   pnpm install
   ```
3. Completar `.env`:
   ```env
   # Para pruebas locales
   LOCAL_RPC_URL="http://127.0.0.1:8545"

   # Dirección del contrato (se genera después del despliegue)
   # LOCAL_CONTRACT_ADDRESS=
   ```

### 6. Ejecutar por primera vez
1. Iniciar un nodo Hardhat:
   ```bash
   npx hardhat node
   ```
   Despues copia una de las Private key de una de las Account que se muestra en la terminal:

   ```bash
      Account #0:  0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 (10000 ETH)
      Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80        

      Account #1:  0x70997970c51812dc3a010c7d01b50e0d17dc79c8 (10000 ETH)
      Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d        

      Account #2:  0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc (10000 ETH)
      Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a        

      Account #3:  0x90f79bf6eb2c4f870365e785982e1f101e93b906 (10000 ETH)
      Private Key: 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6        

      Account #4:  0x15d34aaf54267db7d7c367839aaf71a00a2c6a65 (10000 ETH)
      Private Key: 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a        

      Account #5:  0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc (10000 ETH)
      Private Key: 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba        

      Account #6:  0x976ea74026e726554db657fa54763abd0c3a0aa9 (10000 ETH)
      Private Key: 0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e
```

2. En otra terminal (misma carpeta), desplegar en local:
   ```bash
   npx hardhat run scripts/deploy-voting.ts --network localhost
   ```
   Despues copiar la direccion:
      Ej: Contrato VotingSystem desplegado en: 0x5fbdb2315678afecb367f032d93f642f64180aa3
      
3. Guarda la dirección del contrato impresa en consola. La necesitarás para el backend.

### 7. Scripts útiles
- `pnpm hardhat test` → corre los tests.
- `pnpm compile` → compila los contratos.
- `pnpm node` → inicia nodo local para desarrollo.

### 4. Crear una elección desde scripts (opcional)
Si deseas crear elecciones directamente con Hardhat en vez de usar el panel web:

```bash
npx hardhat console --network localhost
```

```javascript
const VotingSystem = await ethers.getContractAt("VotingSystem", "<ADDRESS>");
await VotingSystem.createElection(
  "Consulta popular",
  "Descripción corta",
  0,                 // inicio inmediato
  0,                 // sin fin
  ["Sí", "No"],     // opciones
  []                 // whitelist inicial (vacía)
);
```

---

## backend-api

### 1. Configuración inicial
1. Entrar a la carpeta:
   ```bash
   cd backend-api
   ```
2. Instalar dependencias (ya ejecutaste `pnpm install` recientemente, repítelo si limpiaste `node_modules`):
   ```bash
   pnpm install
   ```
3. Crea `backend-api/.env` con la información mínima:
   ```env
   PORT=4000

   # PostgreSQL
   DB_DIALECT=postgres
   DB_HOST=localhost
   DB_USER=postgres
   DB_PASSWORD=tu_password
   DB_NAME=voting_app
   DB_PORT=5432

   # JWT
   JWT_SECRET=cadena_segura
   JWT_EXPIRATION=1h

   # CORS
   FRONTEND_ORIGIN=http://localhost:3000

   # Smart contract
   SMART_CONTRACT_ADDRESS=0x... # Dirección del VotingSystem desplegado
   SMART_CONTRACT_RPC_URL=http://127.0.0.1:8545
   # SMART_CONTRACT_ABI_PATH=Ruta opcional al ABI JSON

   # Operaciones admin
   ADMIN_API_KEY=define_un_api_key
   ADMIN_WALLET_PRIVATE_KEY=0x... # Private key usada por authorizeWhitelist
   ```

4. Asegúrate de que PostgreSQL esté ejecutándose y la base `voting_app` exista (puedes crearla con `createdb` o PGAdmin).

### 4. Credenciales de administrador por defecto (pruebas)
Para agilizar las pruebas locales, puedes usar las siguientes credenciales:
- **Email**: `admin@votacion.com`
- **Contraseña**: `admin123`

> Nota: Estas credenciales deben existir en la tabla `users` con `role = 'admin'`. Si no existen, créalas manualmente o vía el frontend de registro y luego actualiza el rol en PostgreSQL:
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@demo.com';
```

### 5. Variables de entorno para el frontend (solo desarrollo)
En `frontend-client/.env.local`:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
# Opcional: solo si deseas mostrar advertencias
NEXT_PUBLIC_ADMIN_API_KEY=define_un_api_key
```
> Importante: Las rutas de solo lectura (`GET /admin/elections`, `GET /admin/voters`) ya no requieren `NEXT_PUBLIC_ADMIN_API_KEY`. Solo las operaciones mutables (ej. crear elecciones) la usan.

### 6. Ejecutar por primera vez
1. Inicia el servidor:
   ```bash
   pnpm run dev
   ```
2. Revisa la consola. Debes ver:
   - Conexión a PostgreSQL exitosa.
   - Mensajes de sincronización de Sequelize.
   - API escuchando en `PORT`.

### 7. Scripts útiles
- `pnpm run dev` → nodemon + recarga en caliente.
- `pnpm start` → modo producción (requiere `pnpm build` previo).

### 8. Endpoints administrativos clave
- `POST /api/admin/elections`
  - Headers obligatorios: `Authorization: Bearer <JWT admin>` y `X-Admin-Api-Key` (solo para operaciones mutables)
  - Body JSON:
    ```json
    {
      "title": "Elección municipal 2025",
      "description": "Primera vuelta",
      "start_time": "2025-01-20T12:00:00Z",
      "end_time": "2025-01-21T00:00:00Z",
      "options": ["Candidato A", "Candidato B"],
      "initial_voters": ["0xabc...", "0xdef..."]
    }
    ```
  - Retorna `electionId`, hash de transacción y bloque.

- `POST /api/admin/elections/:id/authorize`
  - Headers: mismos que arriba.
  - Body: `{ "voter_addresses": ["0x..."] }`
- `GET /api/admin/actions` para consultar la bitácora.

---

## frontend-client

### 1. Configuración inicial
1. Entrar a la carpeta:
   ```bash
   cd frontend-client
   ```
2. Instalar dependencias (si `create-next-app` ya las instaló, verifica de todas formas):
   ```bash
   pnpm install
   ```
3. Crear `frontend-client/.env.local`:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
   ```

### 6. Ejecutar por primera vez
1. Inicia Next.js:
   ```bash
   pnpm run dev
   ```
2. Abre `http://localhost:3000`.
3. La landing incluye todos los flujos: registro/login, vinculación, consultas on-chain y panel admin.

### 7. Scripts útiles
- `pnpm run dev` → modo desarrollo.
- `pnpm run build && pnpm run start` → producción.

---

## Flujo de pruebas integrado

1. **Desplegar contrato:**
   - Corre `pnpm hardhat node` en `smart-contracts/`.
   - Despliega `VotingSystem` y copia el address.

2. **Configurar backend:**
   - Pega el `SMART_CONTRACT_ADDRESS` en `backend-api/.env`.
   - Ajusta `SMART_CONTRACT_RPC_URL` (ej. `http://127.0.0.1:8545`).
   - Define `ADMIN_API_KEY` y la `ADMIN_WALLET_PRIVATE_KEY` del deployer.
   - Ejecuta `pnpm run dev`.

3. **Preparar cuentas:**
   - Registra un usuario (vía frontend o `curl`).
   - Promuévelo a admin (actualiza columna `role` en la tabla `users` a `admin`).
   - Inicia sesión desde el frontend; copia el JWT resultante.
   - Opcional: usa las credenciales por defecto `admin@demo.com` / `admin123` si ya existen en la base.

4. **Flujos en frontend:**
   - Registro y login Web2.
   - Vincular wallet (requiere JWT).
   - Crear elecciones desde la sección "Operaciones administrativas" (requiere rol admin + API Key para escritura).
   - Listar elecciones y padrón de votantes desde el panel admin (solo JWT + rol admin, sin API Key).
   - Consultar elecciones (`/elections/:id`) y estado de votantes.
   - Panel admin para autorizar whitelist (necesita JWT + API Key + private key configurada en backend).

5. **Validaciones finales:**
   - Verifica en `backend-api` los logs de `AdminAction` para las operaciones admin.
   - Confirma que el frontend refleja los datos del contrato (títulos, opciones, resultados).

Con estos pasos podrás levantar por primera vez cada módulo y ejecutar el sistema completo en local. La configuración está optimizada para desarrollo local sin dependencias de redes externas.
