cat > app/a/reject/route.ts <<'EOF'
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
  if (actionToken.action !== "REJECT") return NextResponse.json({ error: "Wrong action" }, { status: 400 });

  const r = actionToken.request;

  await prisma.$transaction([
    prisma.actionToken.update({
      where: { id: actionToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.request.update({
      where: { id: r.id },
      data: { status: "REJECTED", rejectedAt: new Date() },
    }),
  ]);

  const bookingLink = `${process.env.PUBLIC_BASE_URL || new URL(req.url).origin}/book`;

  await sendEmail({
    to: r.customerEmail,
    subject: "Δεν είναι διαθέσιμη η ώρα που ζητήσατε — επιλέξτε άλλη",
    html: `
      <p>Γεια σας ${r.customerName},</p>
      <p>Δυστυχώς η ώρα που ζητήσατε δεν είναι διαθέσιμη.</p>
      <p>Μπορείτε να επιλέξετε άλλο διαθέσιμο ραντεβού εδώ:</p>
      <p><a href="${bookingLink}">${bookingLink}</a></p>
    `,
  });

  const baseUrl = process.env.PUBLIC_BASE_URL || new URL(req.url).origin;
  return NextResponse.redirect(`${baseUrl}/status/${r.publicCode}`);
}
EOF
