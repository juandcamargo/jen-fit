import { PrismaClient } from "../src/generated/prisma"
import { BADGES, CHALLENGES } from "../src/lib/gamification/catalog"

const prisma = new PrismaClient()

async function main() {
  for (const badge of BADGES) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      create: badge,
      update: badge,
    })
  }

  for (const challenge of CHALLENGES) {
    await prisma.challenge.upsert({
      where: { code: challenge.code },
      create: challenge,
      update: challenge,
    })
  }

  console.log(`Seeded ${BADGES.length} badges and ${CHALLENGES.length} challenges.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
