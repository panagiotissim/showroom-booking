import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { makeToken, hashToken } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";

function makePublicCode() {
  return Math.random().toString(36).slice(2, 10);
}

export async function POST(req: Request) {
  const body = await req.json();

  const {
    periodId,
    date,
    startTime,
    endTime,
    customerName,
    customerEmail,
    customerPhone,
    customerNote,
  } = body;

  const publicCode = makePublicCode();

  const requestRow = await prisma.request.create({
    data: {
      publicCode,
      periodId,
      date,
      startTime,
      endTime,
      customerName,
      customerEmail,
      customerPhone,
      customerNote: customerNote || null,
    },
  });

  // approve/reject tokens
  const approveRaw = makeToken();
  const rejectRaw = makeToken();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await prisma.actionToken.createMany({
    data: [
      { requestId: requestRow.id, action: "APPROVE", tokenHash: hashToken(approveRaw), expiresAt },
      { requestId: requestRow.id, action: "REJECT", tokenHash: hashToken(rejectRaw), expiresAt },
    ],
  });

  const baseUrl = process.env.PUBLIC_BASE_URL || new URL(req.url).origin;
  const approveLink = `${baseUrl}/a/approve?token=${approveRaw}`;
  const rejectLink = `${baseUrl}/a/reject?token=${rejectRaw}`;

  // admin email
  await sendEmail({
    to: process.env.ADMIN_EMAIL!,
    subject: `Νέο αίτημα ραντεβού: ${date} ${startTime}`,
    html: `
      <p>Νέο αίτημα ραντεβού.</p>
      <p><b>Πελάτης:</b> ${customerName}<br/>
      <b>Email:</b> ${customerEmail}<br/>
      <b>Τηλέφωνο:</b> ${customerPhone}<br/>
      <b>Ημερομηνία/Ώρα:</b> ${date} ${startTime}–${endTime}<br/>
      <b>Σημείωση:</b> ${customerNote || "-"} </p>
      <p>✅ <a href="${approveLink}">Έγκριση</a><br/>
      ❌ <a href="${rejectLink}">Απόρριψη</a></p>
    `,
  });

  // customer pending email
  await sendEmail({
    to: customerEmail,
    subject: "Λάβαμε το αίτημά σας για ραντεβού (σε αναμονή έγκρισης)",
    html: `
      <p>Γεια σας ${customerName},</p>
      <p>Λάβαμε το αίτημά σας και είναι <b>σε αναμονή έγκρισης</b>.</p>
      <p><b>Ημερομηνία/Ώρα:</b> ${date} ${startTime}–${endTime}</p>
      <p>Θα λάβετε νέο email μόλις εγκριθεί ή αν χρειαστεί αλλαγή.</p>
    `,
  });

  return NextResponse.json({ ok: true, publicCode });
}
