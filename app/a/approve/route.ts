import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const tokenHash = hashToken(token);

  const actionToken = await prisma.actionToken.findUnique({
    where: { tokenHash },
    include: { request: true },
  });

  if (!actionToken) return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  if (actionToken.usedAt) return NextResponse.json({ error: "Token already used" }, { status: 400 });
  if (actionToken.expiresAt < new Date()) return NextResponse.json({ error: "Token expired" }, { status: 400 });
  if (actionToken.action !== "APPROVE") return NextResponse.json({ error: "Wrong action" }, { status: 400 });

  const r = actionToken.request;

  // prevent double-booking
  const alreadyApproved = await prisma.request.findFirst({
    where: {
      periodId: r.periodId,
      date: r.date,
      startTime: r.startTime,
      status: "APPROVED",
    },
  });

  if (alreadyApproved) {
    await prisma.actionToken.update({
      where: { id: actionToken.id },
      data: { usedAt: new Date() },
    });
    return NextResponse.json({ error: "Slot already booked" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.actionToken.update({
      where: { id: actionToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.request.update({
      where: { id: r.id },
      data: { status: "APPROVED", approvedAt: new Date() },
    }),
  ]);

  await sendEmail({
    to: r.customerEmail,
    subject: `Επιβεβαιώθηκε το ραντεβού σας: ${r.date} ${r.startTime}`,
    html: `
      <p>Γεια σας ${r.customerName},</p>
      <p>Το ραντεβού σας <b>εγκρίθηκε</b>.</p>
      <p><b>Ημερομηνία/Ώρα:</b> ${r.date} ${r.startTime}–${r.endTime}</p>
      <p><b>Διεύθυνση:</b> ${process.env.SHOWROOM_ADDRESS}</p>
      <p><b>Χάρτης:</b> <a href="${process.env.MAPS_LINK}">${process.env.MAPS_LINK}</a></p>
      <p>Αν χρειάζεστε αλλαγή, απαντήστε σε αυτό το email.</p>
    `,
  });

  const baseUrl = process.env.PUBLIC_BASE_URL || new URL(req.url).origin;
  return NextResponse.redirect(`${baseUrl}/status/${r.publicCode}`);
}
