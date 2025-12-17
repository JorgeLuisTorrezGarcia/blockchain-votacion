

# Smart Contracts – MVP de Votaciones

Este módulo contiene el entorno de desarrollo de contratos inteligentes para el MVP de votaciones basado en Ethereum. Está construido sobre Hardhat 3, utilizando el plugin oficial `@nomicfoundation/hardhat-toolbox-viem` para integrarse con la librería `viem`.

## ¿Qué es Hardhat?

Hardhat es un entorno de desarrollo profesional para Ethereum que facilita compilar, desplegar y depurar smart contracts. Su objetivo es darte una "caja de arena" local que imita el comportamiento de la red sin gastar dinero real ni esperar confirmaciones lentas. La versión 3 introduce perfiles de compilación, mejoras en la experiencia con `viem` y soporte nativo para scripting orientado a workflows modernos [^hardhat-whats-new]. Permite a los equipos iterar rápidamente sobre contratos sin depender de redes públicas y proporciona herramientas para pruebas, tareas personalizadas y automatización de despliegues [^hardhat-contracts] [^hardhat-deployment].

### Glosario rápido

- **Smart Contract**: programa que vive en la blockchain. Se escribe en Solidity y se ejecuta de forma determinista en la red.
- **Viem**: librería moderna para interactuar con Ethereum (similar a ethers.js, pero con enfoque tipado y performance). Hardhat la integra para que los scripts tengan acceso sencillo a operaciones de despliegue y llamadas.
- **Ganache / Hardhat Node**: redes locales que corren en tu máquina. Son ideales para desarrollo porque se reinician rápido y dan cuentas preconfiguradas.
- **Ignition**: sistema de Hardhat para describir despliegues declarativos. Para este MVP preferimos scripts manuales por simplicidad.

## Cómo usamos Hardhat en este proyecto

- **Compilación y optimización**: se trabaja con Solidity `0.8.28` y optimizador activado (200 runs) para obtener bytecode razonablemente eficiente sin complicar el MVP.
- **Plugins**: se incluye `@nomicfoundation/hardhat-toolbox-viem`, lo que habilita utilidades de testing, despliegue y consumo de `viem` directamente desde los scripts.
- **Redes configuradas**:
  - `hardhat`: red in-memory ideal para pruebas locales instantáneas.
  - `localhost`: conexión HTTP hacia un nodo local (por ejemplo, Ganache o `hardhat node`).
- **Scripting**: todo el flujo de despliegue se realiza mediante scripts TypeScript usando la API de `viem`, siguiendo la guía oficial de Hardhat para despliegues automatizados [^hardhat-deployment-script].

## Estructura de carpetas y archivos

```
smart-contracts/
├─ contracts/
│  └─ VotingSystem.sol       # Contrato principal: creación de elecciones, whitelist y emisión de votos
├─ scripts/
│  ├─ deploy-voting.ts       # Script principal de despliegue (sin seed automático por defecto)
│  └─ send-op-tx.ts          # Ejemplo para enviar transacciones en cadenas Optimism simuladas
├─ ignition/                 # Reservado para módulos Ignition (vacío en el MVP)
├─ test/                     # Carpeta para tests de contratos (no priorizados en este MVP)
├─ hardhat.config.ts         # Configuración central de Hardhat 3
├─ package.json              # Scripts npm y dependencias de desarrollo
├─ tsconfig.json             # Configuración de TypeScript para scripts
└─ .env                      # Variables de entorno (no versionado)
```

> **¿Por qué `ignition/` está vacío?** Hardhat Ignition permite describir despliegues como "recetas" declarativas. En este MVP optamos por scripts TS sencillos para que puedas leer paso a paso qué ocurre. Si más adelante necesitas pipelines reproducibles o despliegues multi-contrato complejos, puedes crear un módulo Ignition y reutilizar la misma configuración de Hardhat.

## Requisitos previos

1. Node.js ≥ 18.
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Configurar las variables sensibles en `smart-contracts/.env`.

### Variables de entorno y su propósito

| Variable | ¿Para qué sirve? | ¿De dónde obtengo el valor? |
|----------|------------------|-----------------------------|
| `LOCAL_RPC_URL` | Dirección del nodo local (Hardhat, Ganache, etc.). Permite a los scripts conectarse a tu entorno local. | Si usas `npm run node`, el valor por defecto es `http://127.0.0.1:8545`. Puedes omitirla y el script tomará ese valor automáticamente. |
| `SEED_ELECTION` y prefijos relacionados | Controlan si el script `deploy-voting.ts` debe crear una elección demo (solo cuando quieras datos de ejemplo). | Se configuran manualmente según el caso. Si no necesitas un prellenado, simplemente no definas `SEED_ELECTION`. |

> Recuerda: `.env` nunca se versiona. Copia el archivo de ejemplo (si existe) o crea uno nuevo y mantenlo fuera del repositorio.

### Variables opcionales para semilla manual

El script `deploy-voting.ts` soporta la creación opcional de una elección demo si `SEED_ELECTION=true`. Por defecto **no** se despliega ninguna elección inicial para mantener el control sobre los datos iniciales del MVP. Para habilitarla manualmente puedes definir:

```env
SEED_ELECTION=true
SEED_ELECTION_TITLE=Elección de Prueba
SEED_ELECTION_DESCRIPTION=Descripción corta
SEED_ELECTION_START=0          # 0 => inicio inmediato
SEED_ELECTION_END=0            # 0 => sin límite
SEED_ELECTION_OPTIONS=Opción A,Opción B
SEED_ELECTION_VOTERS=0x123...,0x456...
```

Si no deseas la semilla (caso por defecto), simplemente omite `SEED_ELECTION` o déjala distinta de `true`.

## Scripts disponibles

Todos los comandos se ejecutan desde `smart-contracts/`.

| Script               | Descripción                                                                 |
|----------------------|-----------------------------------------------------------------------------|
| `npm run compile`    | Compila los contratos con el perfil por defecto de Hardhat.                  |
| `npm run node`       | Levanta un nodo Hardhat local en `http://127.0.0.1:8545`.                    |
| `npm run deploy:hardhat` | Compila (si es necesario) y despliega `VotingSystem` sobre la red in-memory de Hardhat. |
| `npm run deploy:local`   | Despliega contra el nodo definido en `LOCAL_RPC_URL` (ej. Ganache).      |

> Consejo: La configuración está optimizada para desarrollo local. Si más adelante necesitas desplegar en testnets, puedes agregar configuraciones adicionales.

### ¿Qué ocurre al ejecutar cada script?

- `npm run node`: levanta una blockchain local con cuentas prefundidas. Cada transacción se mina instantáneamente.
- `npm run deploy:hardhat`: usa la red in-memory de Hardhat para compilar (si hace falta) y desplegar el contrato. Ideal para pruebas rápidas desde la CLI.
- `npm run deploy:local`: realiza el mismo proceso pero contra el RPC que indiques (por ejemplo, una instancia de Ganache o un Hardhat Node en otra terminal).

## Flujo de trabajo recomendado

1. **Levantar red local rápida**
   ```bash
   npm run node
   ```
2. **Compilar contratos** (opcional si Hardhat ya lo hace on demand):
   ```bash
   npm run compile
   ```
3. **Desplegar contrato VotingSystem** en la red deseada:
   ```bash
   npm run deploy:hardhat
   # o bien
   npm run deploy:local
   ```
4. **Registrar la dirección del contrato** impresa en consola para usarla desde backend/frontend.

> Si deseas validar que el contrato quedó bien desplegado, puedes ejecutar `npx hardhat console --network hardhat` (o la red que corresponda) y leer funciones como `getElection` para verificar la estructura de datos.

## Referencias

- [Novedades de Hardhat 3](https://hardhat.org/docs/hardhat3/whats-new) [^hardhat-whats-new]
- [Guía oficial para escribir contratos](https://hardhat.org/docs/guides/writing-contracts) [^hardhat-contracts]
- [Guía oficial de despliegue](https://hardhat.org/docs/guides/deployment) [^hardhat-deployment]
- [Despliegue usando scripts](https://hardhat.org/docs/guides/deployment/using-scripts) [^hardhat-deployment-script]

[^hardhat-whats-new]: Documentación oficial de Hardhat 3 – “What’s new”.
[^hardhat-contracts]: Documentación oficial – “Writing contracts”.
[^hardhat-deployment]: Documentación oficial – “Deployment guide”.
[^hardhat-deployment-script]: Documentación oficial – “Deploying smart contracts using scripts”.
