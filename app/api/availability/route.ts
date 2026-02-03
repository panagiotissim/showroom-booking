import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

function makeSlots(openTime: string, closeTime: string, slotMinutes: number) {
  const [oh, om] = openTime.split(":").map(Number);
  const [ch, cm] = closeTime.split(":").map(Number);
  const open = oh * 60 + om;
  const close = ch * 60 + cm;

  const slots: { startTime: string; endTime: string }[] = [];
  for (let t = open; t + slotMinutes <= close; t += slotMinutes) {
    const sh = String(Math.floor(t / 60)).padStart(2, "0");
    const sm = String(t % 60).padStart(2, "0");
    const eh = String(Math.floor((t + slotMinutes) / 60)).padStart(2, "0");
    const em = String((t + slotMinutes) % 60).padStart(2, "0");
    slots.push({ startTime: `${sh}:${sm}`, endTime: `${eh}:${em}` });
  }
  return slots;
}

export async function GET() {
  const period = await prisma.period.findFirst({ where: { isActive: true } });
  if (!period) return NextResponse.json({ ok: false, error: "No active period" }, { status: 404 });

  const allowedDates = Array.isArray(period.allowedDates) ? period.allowedDates : [];

  // booked slots (approved only)
  const approved = await prisma.request.findMany({
    where: { periodId: period.id, status: "APPROVED" },
    select: { date: true, startTime: true },
  });

  const bookedSet = new Set(approved.map(r => `${r.date}__${r.startTime}`));

  const baseSlots = makeSlots(period.openTime, period.closeTime, period.slotMinutes);

  const dates = allowedDates.map((date: string) => {
    const slots = baseSlots.filter(s => !bookedSet.has(`${date}__${s.startTime}`));
    return { date, slots };
  });

  return NextResponse.json({
    ok: true,
    periodId: period.id,
    openTime: period.openTime,
    closeTime: period.closeTime,
    slotMinutes: period.slotMinutes,
    timezone: period.timezone,
    dates,
  });
}
