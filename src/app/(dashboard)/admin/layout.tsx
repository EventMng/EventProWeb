import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { db } from "@/lib/db";

async function getSessionUser() {
    const token = (await cookies()).get('eventpro_session')?.value;
    if (!token) return null;

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) return null;

    try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
        if (typeof payload.id !== 'string') return null;

        return await db.user.findUnique({
            where: {id: payload.id},
            select: { role: true },
        });
    } catch {
        return null;
    }
}

export default async function AdminLayout({
    children
}: {
    children: React.ReactNode;
}) {
    const user = await getSessionUser();

    if (!user || user.role !== 'ORG_ADMIN') {
        redirect('/login');
    }

    return <>{ children }</>
}