# Jen Fit

Nutrición, entrenamiento, hidratación y gamificación para mujeres que quieren perder peso, reducir grasa y mantener su masa muscular — con constancia, no perfección.

Aplicación **funcional de extremo a extremo**: registro/login reales, base de datos persistente, cálculos nutricionales verificados con pruebas unitarias, integración con Open Food Facts, y un motor de gamificación (rachas, niveles, insignias, retos) que reacciona a datos reales.

## Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Prisma 6** — SQLite en desarrollo, cambia a Postgres/Supabase con una sola variable de entorno
- **NextAuth v5** (Credentials + JWT) con contraseñas hasheadas (bcrypt)
- **Tailwind CSS v4** con sistema de diseño propio (tokens de color, modo oscuro, animaciones)
- **Font Awesome** (exclusivamente, vía `@fortawesome/react-fontawesome`)
- **Framer Motion** + CSS transitions para microinteracciones
- **Recharts** para gráficas de progreso
- **Open Food Facts** como fuente de datos nutricionales, detrás de una capa de abstracción (`src/lib/food`) para poder cambiar de proveedor sin tocar el resto de la app
- **Vitest** para las pruebas de fórmulas (BMR, TDEE, MET, balance calórico, etc.)

## Requisitos

- Node.js 20.9+ (el proyecto se probó con Node 24)
- npm

## Instalación

```bash
npm install
cp .env.example .env   # o edita .env directamente
npx prisma migrate dev
npm run db:seed        # insignias y retos (catálogo global, obligatorio)
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Datos de demostración (opcionales)

Crea una cuenta ficticia (**Valentina Torres**) con ~2 semanas de historial realista: comidas, agua, suplementos (colágeno + creatina), entrenamientos de fuerza y cardio, peso en tendencia descendente, rachas, insignias desbloqueadas y Fit Points — todo calculado con las mismas fórmulas de producción, no datos inventados a mano.

```bash
npm run db:seed-demo
```

- **Email:** `demo@jenfit.app`
- **Contraseña:** `Demo1234`

Para eliminarla: `npm run db:seed-demo -- --clear`, o inicia sesión y ve a **Perfil → Eliminar cuenta**.

## Variables de entorno

Ver `.env`. Resumen:

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | Cadena de conexión Prisma. `file:./dev.db` en local; `postgresql://...` para Supabase/Postgres. |
| `AUTH_SECRET` | Secreto para firmar sesiones JWT de NextAuth. Genera uno con `openssl rand -base64 32`. |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app (usada para construir enlaces, p. ej. el de recuperación de contraseña). |
| `OPEN_FOOD_FACTS_BASE_URL` | Host de la API de Open Food Facts (por defecto `https://world.openfoodfacts.org`). |
| `OPEN_FOOD_FACTS_USER_AGENT` | User-Agent descriptivo que Open Food Facts pide para todas las peticiones. |
| `FOOD_PROVIDER` | Proveedor nutricional activo. Solo `openfoodfacts` implementado; el resto de la app habla con `src/lib/food/provider.ts`, así que añadir otro proveedor (USDA, Edamam) no requiere tocar UI ni rutas. |

**Nunca** se exponen claves al frontend: toda llamada a Open Food Facts ocurre en Route Handlers de servidor (`src/app/api/food/*`).

## Migrar a Supabase/Postgres + Vercel + GitHub

Esta sesión no tuvo acceso a tus cuentas de GitHub, Vercel ni Supabase (sin conectores ni CLIs disponibles en este entorno), así que estos tres pasos son manuales:

1. **Supabase**: crea un proyecto en supabase.com, copia el connection string, y:
   ```prisma
   // prisma/schema.prisma
   datasource db {
     provider = "postgresql"   // antes: "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
   Luego:
   ```bash
   npx prisma migrate dev --name init_postgres
   npm run db:seed
   ```
2. **GitHub**: `git init && git add -A && git commit -m "Jen Fit"`, crea el repo en GitHub y `git push`.
3. **Vercel**: importa el repo, define las variables de entorno de la tabla de arriba (con el `DATABASE_URL` de Supabase y un `AUTH_SECRET` nuevo), y despliega.

## Arquitectura de módulos

```
src/
  lib/
    calculations/    # BMR, TDEE, metas de calorías/proteína, macros, % grasa, MET fuerza/cardio, balance — puras, con tests
    dailySummary.ts  # orquestador: recalcula el resumen del día a partir de comidas/agua/ejercicio/suplementos
    gamification/    # puntos, niveles, insignias, rachas, progreso de retos
    food/            # tipos + proveedor Open Food Facts + caché local
    validation/      # esquemas zod por dominio
  app/
    (auth)/          # login, registro, recuperación de contraseña
    onboarding/      # wizard de 6 pasos
    (app)/           # shell protegido: dashboard, food, water, supplements, exercise, progress, achievements, challenges, calendar, profile, settings
    api/             # route handlers — toda mutación pasa por aquí y re-sincroniza gamificación
```

### Por qué "peso actual" nunca es un campo fijo

`Profile` no tiene columna de peso. Todo cálculo (BMR, TDEE, meta de proteína, gasto de ejercicio) llama a `getWeightAtDate()`, que busca el `WeightLog` más reciente en o antes de la fecha. Si cambias tu peso, todo se recalcula automáticamente en la próxima sincronización — tal como pide el spec.

### Colágeno vs. proteína completa

`proteinCollagen` se acumula por separado de `proteinConsumed` en `DailySummary`, tanto si el colágeno viene de un alimento (`FoodItem.isCollagen`) como de un suplemento (`Supplement.proteinType === "collagen"`). La creatina nunca suma calorías (`Supplement.isCreatine`).

## Pruebas

```bash
npm test
```

26 pruebas cubren BMR, TDEE (incluyendo que los pasos, no solo los días de entrenamiento, dominan el factor NEAT diario), metas de calorías/proteína con sus pisos de seguridad, consistencia de macros, % de grasa, MET de fuerza y cardio, y el balance calórico diario/semanal — incluyendo el ejemplo exacto de la sección 21 del spec.

## Estado de la implementación

**Completo y funcional:** autenticación, onboarding, cálculos (BMR/TDEE/déficit/proteína/MET/% grasa/balance), tracker de alimentos con búsqueda real en Open Food Facts + caché local + entrada manual + recetas, tracker de agua, suplementos (colágeno/creatina diferenciados), registro de fuerza y cardio con estimación de gasto, resumen matutino con mensajes sin culpa, Fit Points/niveles/insignias/rachas/retos reaccionando a datos reales, histórico con gráficas y calibración de TDEE tras 21+ días, modo claro/oscuro, exportación y eliminación de cuenta, PWA básica.

**Simplificado conscientemente (documentado, no oculto):**
- **Escaneo de código de barras**: la búsqueda por código de barras funciona contra Open Food Facts (`/api/food/barcode/[code]`), pero la captura es por texto — no se integró una librería de cámara/decodificación en esta sesión.
- **Notificaciones push reales**: la pantalla de configuración persiste preferencias (activadas/horario), pero no hay Service Worker enviando push todavía — es el siguiente paso natural para una PWA instalada.
- **Recuperación de contraseña por correo**: el flujo completo existe (token, expiración, cambio de contraseña), pero como no hay proveedor de email configurado, el enlace se imprime en consola del servidor y se muestra en pantalla solo en desarrollo. Conecta Resend/SES/Postmark en `src/app/api/auth/forgot-password/route.ts` para producción.
- **Ciclo menstrual**: el modelo `CycleLog` existe en el esquema, pero no se construyó su UI en esta pasada.
- **Fotos de progreso**: `BodyMeasurement.photoUrl` existe en el esquema; no se implementó subida de archivos.

## Comandos útiles

```bash
npm run dev           # servidor de desarrollo
npm run build          # build de producción (verificado sin errores)
npm test               # pruebas de fórmulas
npm run db:seed         # catálogo de insignias/retos (necesario una vez)
npm run db:seed-demo    # cuenta demo con historial realista
npx prisma studio       # explorar la base de datos
```
