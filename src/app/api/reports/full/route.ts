import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/authz";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const roleCheck = requireRole(user, ["ORG_ADMIN"]);
    if (roleCheck) return roleCheck;

    const events = await db.event.findMany({
      where: { organizationId: user.organizationId },
      include: {
        registrations: true,
      },
      orderBy: { eventDate: 'desc' }
    });

    // Generate CSV Header
    let csv = "Event Name,Event Date,Total Registered,Total Participated,Total No-Shows,Attendance Rate (%)\n";

    events.forEach(event => {
      const totalRegistered = event.registrations.length;
      const totalParticipated = event.registrations.filter(r => r.attended).length;
      const noShows = totalRegistered - totalParticipated;
      const attendanceRate = totalRegistered > 0 ? ((totalParticipated / totalRegistered) * 100).toFixed(1) : 0;
      
      // Escape commas in event name
      const eventName = `"${event.name.replace(/"/g, '""')}"`;
      const eventDate = event.eventDate.toISOString().split('T')[0];

      csv += `${eventName},${eventDate},${totalRegistered},${totalParticipated},${noShows},${attendanceRate}%\n`;
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="full_organization_report.csv"',
      },
    });

  } catch (error) {
    console.error("Failed to generate full report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
