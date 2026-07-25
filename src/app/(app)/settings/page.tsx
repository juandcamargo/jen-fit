import { requireOnboardedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "./SettingsClient";

const NOTIFICATION_LABELS: Record<string, string> = {
  breakfast: "Recordatorio de desayuno",
  water: "Recordatorios de agua",
  creatine: "Recordatorio de creatina",
  collagen: "Recordatorio de colágeno",
  lunch: "Recordatorio de almuerzo",
  dinner: "Recordatorio de cena",
  training: "Recordatorio de entrenamiento",
  night_summary: "Resumen nocturno",
  weekly_summary: "Resumen semanal",
  weekly_weigh_in: "Pesaje semanal",
};

export default async function SettingsPage() {
  const { session, profile } = await requireOnboardedUser();
  const notifications = await prisma.notificationSetting.findMany({ where: { userId: session.user.id } });

  return (
    <SettingsClient
      units={profile!.units}
      notifications={notifications.map((n) => ({ type: n.type, enabled: n.enabled, time: n.time, label: NOTIFICATION_LABELS[n.type] ?? n.type }))}
    />
  );
}
