import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { makeToken, hashToken } from "../../../lib/tokens";
import { sendEmail } from "../../../lib/email";

function makePublicCode() {
  return Math.random().toString(36).slice(2, 10);
}

export async function POST(req: Request) {
  try {
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
    } = body || {};

    if (!periodId || !date || !startTime || !endTime || !customerName || !customerEmail || !customerPhone) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    const publicCode = makePublicCode();

    const created = await prisma.request.create({
      data: {
        periodId,
        date,
        startTime,
        endTime,
        customerName,
        customerEmail,
        customerPhone,
        customerNote: customerNote || null,
        status: "PENDING",
        publicCode,
      },
    });

    const approveRaw = makeToken();
    const rejectRaw = makeToken();

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

    await prisma.actionToken.createMany({
      data: [
        {
          requestId: created.id,
          action: "APPROVE",
          tokenHash: hashToken(approveRaw),
          expiresAt,
        },
        {
          requestId: created.id,
          action: "REJECT",
          tokenHash: hashToken(rejectRaw),
          expiresAt,
        },
      ],
    });

    const baseUrl = process.env.PUBLIC_BASE_URL || new URL(req.url).origin;

    const approveLink = `${baseUrl}/a/approve?token=${approveRaw}`;
    const rejectLink = `${baseUrl}/a/reject?token=${rejectRaw}`;
    const statusLink = `${baseUrl}/status/${publicCode}`;

    const notifyTo = process.env.NOTIFY_EMAIL || "sofiatzanetopoulou@sim.gr";

    await sendEmail({
      to: notifyTo,
      subject: `Νέο αίτημα ραντεβού: ${date} ${startTime}`,
      html: `
        <h2>Νέο αίτημα ραντεβού</h2>
        <p><b>Πελάτης:</b> ${customerName}</p>
        <p><b>Email:</b> ${customerEmail}</p>
        <p><b>Τηλέφωνο:</b> ${customerPhone}</p>
        <p><b>Ημερομηνία/Ώρα:</b> ${date} ${startTime}–${endTime}</p>
        ${customerNote ? `<p><b>Σημείωση:</b> ${customerNote}</p>` : ""}

        <p style="margin-top:16px;">
          <a href="${approveLink}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#111;color:#fff;text-decoration:none;">✅ ΕΓΚΡΙΣΗ</a>
          <a href="${rejectLink}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#eee;color:#111;text-decoration:none;margin-left:8px;">❌ ΑΠΟΡΡΙΨΗ</a>
        </p>

        <p style="margin-top:16px;">
          <a href="${statusLink}">Άνοιγμα κατάστασης αιτήματος</a>
        </p>
      `,
    });

    return NextResponse.json({ ok: true, publicCode });
  } catch (e: any) {
    console.error("POST /api/requests failed:", e?.message || e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
