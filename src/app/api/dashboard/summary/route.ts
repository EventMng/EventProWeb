import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/authz";
import { deriveEventStatus } from "@/lib/events";

// GET /api/dashboard/summary — the 4 admin-dashboard KPI numbers, scoped to
// the logged-in ORG_ADMIN's own organization. "Live"/"Upcoming" reuse the
// same deriveEventStatus() convention as /api/events (same calendar day as
// now = Live) rather than a separate definition, so all three surfaces agree.
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const roleCheck = requireRole(user, ["ORG_ADMIN"]);
    if (roleCheck) return roleCheck;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const events = await db.event.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true, eventDate: true },
    });

    const liveNow = events.filter((e) => deriveEventStatus(e.eventDate, now) === "Live").length;

    const upcomingEvents = events
      .filter((e) => deriveEventStatus(e.eventDate, now) === "Upcoming")
      .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

    const nextEvent = upcomingEvents[0]
      ? { name: upcomingEvents[0].name, eventDate: upcomingEvents[0].eventDate }
      : null;

    const orgRegistrationScope = { event: { organizationId: user.organizationId } };

    const [checkedInToday, totalRegistrations, attendedRegistrations] = await Promise.all([
      db.eventRegistration.count({
        where: { ...orgRegistrationScope, attendedAt: { gte: startOfToday, lt: startOfTomorrow } },
      }),
      db.eventRegistration.count({ where: orgRegistrationScope }),
      db.eventRegistration.count({ where: { ...orgRegistrationScope, attended: true } }),
    ]);

    const attendanceRate =
      totalRegistrations > 0 ? Math.round((attendedRegistrations / totalRegistrations) * 100) : 0;

    return NextResponse.json({
      liveNow,
      checkedInToday,
      attendanceRate,
      attendedRegistrations,
      totalRegistrations,
      upcomingEvents: upcomingEvents.length,
      nextEvent,
    });
  } catch (error: any) {
    console.error("Failed to fetch dashboard summary:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
