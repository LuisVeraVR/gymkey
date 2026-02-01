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
   cd apps/api
   npx prisma migrate dev --name init
   npx ts-node prisma/seed.ts
   ```

4. **Levantar Servicios:**

   *Terminal 1 (Backend):*
   ```bash
   pnpm --filter api start:dev
   ```

   *Terminal 2 (Admin Web):*
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
