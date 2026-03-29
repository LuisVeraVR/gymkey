# GymKey SaaS

Plataforma de gestión para gimnasios (SaaS) con arquitectura Monorepo.

## Estructura del Proyecto

- **apps/api**: Backend (NestJS + Prisma + Postgres)
- **apps/admin-web**: Panel Administrativo (Next.js + Tailwind)
- **apps/mobile**: App para Clientes (Expo + React Native)
- **packages/shared**: Librería compartida de tipos y utilidades

## Requisitos Previos

- Node.js (v18+)
- Docker & Docker Compose
- pnpm (`npm install -g pnpm`)

## Quick Start (Setup < 10 min)

1. **Instalar dependencias:**
   ```bash
   pnpm install
   ```

2. **Levantar Base de Datos:**
   ```bash
   docker-compose up -d
   ```

3. **Configurar Entorno y DB:**
   ```bash
   cp apps/api/.env.example apps/api/.env
   # Edita apps/api/.env (DATABASE_URL, JWT_SECRET, etc.)

   cd apps/api
   npx prisma migrate dev --name init
   npx ts-node prisma/seed.ts
   ```

4. **Variables del panel admin (opcional pero recomendado):**
   ```bash
   cp apps/admin-web/.env.example apps/admin-web/.env.local
   ```
   Por defecto el admin usa `NEXT_PUBLIC_API_URL=http://localhost:3001/api`. La API escucha en el puerto **3001** y el admin en **3000** para evitar conflictos.

5. **Levantar Servicios:**

   *Terminal 1 (Backend, puerto 3001 por defecto):*
   ```bash
   pnpm --filter api start:dev
   ```

   *Terminal 2 (Admin Web, puerto 3000):*
   ```bash
   pnpm --filter admin-web dev
   ```

## Credenciales de Prueba

| Rol | Email | Password | Acceso |
|-----|-------|----------|--------|
| **Super Admin** | `super@gymkey.com` | `123456` | Admin Panel |
| **Gym Admin** | `admin@demogym.com` | `123456` | Admin Panel |
| **Staff** | `staff@demogym.com` | `123456` | Admin Panel |
| **Member** | `member@demogym.com` | `123456` | Mobile App (No Admin) |

## Comportamiento Esperado

1. **Login Admin:** Ve a `http://localhost:3000/login`.
2. Ingresa con `admin@demogym.com`.
3. Deberías ser redirigido a `/dashboard`.
4. Si intentas entrar con `member@demogym.com`, verás un error "No tienes permisos".
5. Si intentas ir a `/dashboard` sin login, serás redirigido a `/login`.
