import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { requireRole } from "@/lib/authz";

// GET /api/dashboard/traffic?range=today|week
// Real check-in counts for the Attendance Traffic Graph, scoped to the
// logged-in ORG_ADMIN's organization. "today" buckets by hour of day
// (0-23, server-local); "week" buckets by calendar day over a rolling
// 7-day window ending today. Each bucket carries a short axis `label`
// plus a `periodLabel` describing its exact time period (an hour range
// for "today", a full date for "week") for tooltips.
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const roleCheck = requireRole(user, ["ORG_ADMIN"]);
    if (roleCheck) return roleCheck;

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") === "week" ? "week" : "today";

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    let rangeStart: Date;
    if (range === "today") {
      rangeStart = startOfToday;
    } else {
      rangeStart = new Date(startOfToday);
      rangeStart.setDate(rangeStart.getDate() - 6);
    }

    const registrations = await db.eventRegistration.findMany({
      where: {
        event: { organizationId: user.organizationId },
        attendedAt: { gte: rangeStart, lt: startOfTomorrow },
      },
      select: { attendedAt: true },
    });

    type Bucket = { label: string; periodLabel: string; count: number };
    let buckets: Bucket[];

    if (range === "today") {
      const counts = new Array(24).fill(0);
      for (const r of registrations) {
        if (r.attendedAt) counts[r.attendedAt.getHours()] += 1;
      }
      buckets = counts.map((count, hour) => {
        const hourStart = new Date(2000, 0, 1, hour);
        const hourEnd = new Date(2000, 0, 1, hour + 1);
        return {
          label: hourStart.toLocaleTimeString(undefined, { hour: "numeric" }),
          periodLabel: `${hourStart.toLocaleTimeString(undefined, { hour: "numeric" })} – ${hourEnd.toLocaleTimeString(undefined, { hour: "numeric" })}`,
          count,
        };
      });
    } else {
      const days: { date: Date; count: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(startOfToday);
        d.setDate(d.getDate() - i);
        days.push({ date: d, count: 0 });
      }
      for (const r of registrations) {
        if (!r.attendedAt) continue;
        const d = new Date(r.attendedAt.getFullYear(), r.attendedAt.getMonth(), r.attendedAt.getDate());
        const bucket = days.find((b) => b.date.getTime() === d.getTime());
        if (bucket) bucket.count += 1;
      }
      buckets = days.map((b) => ({
        label: b.date.toLocaleDateString(undefined, { weekday: "short" }),
        periodLabel: b.date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }),
        count: b.count,
      }));
    }

    const maxCount = Math.max(0, ...buckets.map((b) => b.count));
    const data = buckets.map((b) => ({ ...b, peak: maxCount > 0 && b.count === maxCount }));

    return NextResponse.json({ range, data });
  } catch (error: any) {
    console.error("Failed to fetch dashboard traffic:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
