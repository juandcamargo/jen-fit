import { prisma } from "@/lib/prisma"

const DEFAULT_STREAK_TYPES = ["logging", "water", "training"] as const

const DEFAULT_NOTIFICATIONS: { type: string; time?: string; enabled: boolean }[] = [
  { type: "breakfast", time: "08:30", enabled: true },
  { type: "water", enabled: true },
  { type: "creatine", enabled: false },
  { type: "collagen", enabled: false },
  { type: "lunch", time: "13:00", enabled: false },
  { type: "dinner", time: "19:30", enabled: false },
  { type: "training", enabled: false },
  { type: "night_summary", time: "21:30", enabled: true },
  { type: "weekly_summary", time: "09:00", enabled: true },
  { type: "weekly_weigh_in", time: "08:00", enabled: false },
]

/**
 * Called right after a new user (and their profile) is created.
 * Uses per-row upserts instead of `createMany({ skipDuplicates: true })`
 * because SQLite doesn't support `skipDuplicates` — this stays portable to
 * Postgres/Supabase without changing the code.
 */
export async function seedDefaultDataForUser(userId: string) {
  await Promise.all(
    DEFAULT_STREAK_TYPES.map((type) =>
      prisma.streak.upsert({
        where: { userId_type: { userId, type } },
        create: { userId, type },
        update: {},
      })
    )
  )

  await Promise.all(
    DEFAULT_NOTIFICATIONS.map((n) =>
      prisma.notificationSetting.upsert({
        where: { userId_type: { userId, type: n.type } },
        create: { userId, type: n.type, time: n.time, enabled: n.enabled },
        update: {},
      })
    )
  )
}
