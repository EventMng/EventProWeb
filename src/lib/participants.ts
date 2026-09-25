import { db } from "@/lib/db";

export async function loadOwnedRegistration(
  registrationId: string,
  organizationId: string,
  userId?: string
) {
  const registration = await db.eventRegistration.findUnique({
    where: { id: registrationId },
    include: { event: true, participant: true },
  });

  if (!registration) {
    return null;
  }

  // 1. Direct organization match
  if (registration.event.organizationId === organizationId) {
    return registration;
  }

  // 2. Check if user is linked to the event's organization or assigned as frontman
  if (userId) {
    const isMemberOfOrg = await db.user.findFirst({
      where: {
        id: userId,
        OR: [
          { organizationId: registration.event.organizationId },
          { organizations: { some: { id: registration.event.organizationId } } },
        ],
      },
      select: { id: true },
    });

    if (isMemberOfOrg) {
      return registration;
    }

    const isAssignedFrontman = await db.eventFrontman.findUnique({
      where: {
        eventId_userId: {
          eventId: registration.eventId,
          userId,
        },
      },
      select: { eventId: true },
    });

    if (isAssignedFrontman) {
      return registration;
    }
  }

  return null;
}
