import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { OnboardingWizard } from "./OnboardingWizard"

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } })
  if (profile?.onboardingCompleted) redirect("/dashboard")

  return <OnboardingWizard name={profile?.name ?? session.user.name ?? ""} />
}
