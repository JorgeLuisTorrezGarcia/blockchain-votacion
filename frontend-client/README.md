# Frontend Client - Next.js Voting App

Este módulo contiene la aplicación frontend construida con Next.js (App Router) que sirve como interfaz de usuario para el sistema de votaciones blockchain.

## Configuración inicial

### 1. Instalar dependencias
```bash
cd frontend-client
npm install
```

### 2. Configurar variables de entorno
Crea el archivo `.env.local` con la URL del backend:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
```

**Nota**: El frontend usa `.env.local` (no `.env`) porque es el estándar de Next.js para variables de entorno locales.

## Ejecutar por primera vez

### 1. Iniciar el servidor de desarrollo
```bash
npm run dev
```

### 2. Acceder a la aplicación
Abre tu navegador en: `http://localhost:3000`

## Funcionalidades disponibles

La aplicación incluye todos los flujos del sistema:

- **Registro/Login**: Creación de usuarios y autenticación Web2
- **Vinculación Wallet**: Conectar dirección Ethereum con cuenta de usuario
- **Consultas Blockchain**: Ver elecciones y estado de votantes
- **Panel Admin**: Autorizar whitelist (requiere rol admin + API key)

## Scripts útiles

- `npm run dev` → Modo desarrollo con recarga en caliente
- `npm run build` → Compila para producción
- `npm run start` → Inicia servidor en modo producción

## Flujo de trabajo completo

1. **Asegúrate que el backend esté corriendo** en `http://localhost:4000`
2. **Inicia el frontend** con `npm run dev`
3. **Registra un usuario** desde la interfaz
4. **Inicia sesión** para obtener JWT
5. **Vincula wallet** para conectar con blockchain
6. **Consulta elecciones** y verifica estado de votantes
7. **Si eres admin**, accede al panel para gestionar whitelist

## Requisitos previos

- Node.js ≥ 18
- Backend API corriendo en `localhost:4000`
- Smart contracts desplegados y configurados en el backend

## Arquitectura

- **Next.js 14+** con App Router
- **TypeScript** para tipado seguro
- **CSS Modules** y estilos globales
- **Client-side** para interactuar con backend API
- **JWT** para autenticación
- **Web3** para conexión con wallet

La aplicación está diseñada para trabajar exclusivamente con el backend local y no requiere configuración de redes externas.