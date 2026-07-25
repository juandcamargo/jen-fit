import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}

export async function requireOnboardedUser() {
  const session = await requireSession();
  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } });
  if (!profile?.onboardingCompleted) {
    redirect("/onboarding");
  }
  return { session, profile };
}
