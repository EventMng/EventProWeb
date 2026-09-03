import { db } from "@/lib/db";

export async function loadOwnedRegistration(registrationId: string, organizationId: string) {
  const registration = await db.eventRegistration.findUnique({
    where: { id: registrationId },
    include: { event: true, participant: true },
  });

  if (!registration || registration.event.organizationId !== organizationId) {
    return null;
  }

  return registration;
}
