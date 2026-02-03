import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * ΒΑΛΕ ΕΔΩ ΤΙΣ 20 ΗΜΕΡΟΜΗΝΙΕΣ (YYYY-MM-DD)
 * π.χ. "2026-11-05"
 */
const allowedDates = [
  "2026-03-01",
  "2026-03-02",
  "2026-03-03",
  "2026-03-04",
  "2026-03-05",
  "2026-03-06",
  "2026-03-07",
  "2026-03-08",
  "2026-03-09",
  "2026-03-10",
  "2026-03-11",
  "2026-03-12",
  "2026-03-13",
  "2026-03-14",
  "2026-03-15",
  "2026-03-16",
  "2026-03-17",
  "2026-03-18",
  "2026-03-19",
  "2026-03-20"
];

async function main() {
  if (!Array.isArray(allowedDates) || allowedDates.length !== 20) {
    throw new Error(`allowedDates must contain exactly 20 dates. Found: ${allowedDates?.length}`);
  }

  // validate format YYYY-MM-DD
  for (const d of allowedDates) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      throw new Error(`Invalid date format: ${d} (expected YYYY-MM-DD)`);
    }
  }

  // Deactivate all previous periods
  await prisma.period.updateMany({
    data: { isActive: false },
  });

  const period = await prisma.period.create({
    data: {
      name: `Showroom ${new Date().getFullYear()}`,
      isActive: true,
      allowedDates,
      openTime: "08:00",
      closeTime: "20:00",
      slotMinutes: 120,
      timezone: "Europe/Athens",
    },
  });

  console.log("✅ Active Period created:");
  console.log("ID:", period.id);
  console.log("Dates:", allowedDates.length);
  console.log("Hours:", `${period.openTime} - ${period.closeTime}`);
  console.log("Slot minutes:", period.slotMinutes);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
