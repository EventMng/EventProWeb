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

    const roleCheck = requireRole(user, ["ORG_ADMIN", "ORGANIZER"]);
    if (roleCheck) return roleCheck;

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
    }

    const event = await db.event.findFirst({
      where: { 
        id: eventId,
        organizationId: user.organizationId 
      },
      include: {
        registrations: {
          include: {
            participant: true
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Generate CSV Header
    let csv = "Member Name,Email,Ticket Type,Status,Check-in Time\n";

    event.registrations.forEach(reg => {
      const name = `"${reg.participant.fullName.replace(/"/g, '""')}"`;
      const email = `"${reg.participant.email.replace(/"/g, '""')}"`;
      const ticketType = `"${reg.ticketType}"`;
      const status = reg.attended ? "Participated" : "Did Not Participate";
      const checkInTime = reg.attendedAt ? `"${reg.attendedAt.toISOString().replace('T', ' ').split('.')[0]}"` : "N/A";

      csv += `${name},${email},${ticketType},${status},${checkInTime}\n`;
    });

    // Sanitize event name for filename
    const safeEventName = event.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${safeEventName}_report.csv"`,
      },
    });

  } catch (error) {
    console.error("Failed to generate event report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
