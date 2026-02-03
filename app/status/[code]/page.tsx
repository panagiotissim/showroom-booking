cat > "app/status/[code]/page.tsx" <<'EOF'
import { prisma } from "@/lib/db";

export default async function StatusPage({ params }: { params: { code: string } }) {
  const r = await prisma.request.findUnique({
    where: { publicCode: params.code },
  });

  if (!r) return <div className="p-8">Δεν βρέθηκε αίτημα.</div>;

  const statusText =
    r.status === "PENDING"
      ? "Σε αναμονή έγκρισης"
      : r.status === "APPROVED"
      ? "Εγκρίθηκε"
      : "Απορρίφθηκε";

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-bold mb-4">Κατάσταση Ραντεβού</h1>

      <div className="rounded-xl border p-4 space-y-2">
        <div><b>Πελάτης:</b> {r.customerName}</div>
        <div><b>Ημερομηνία:</b> {r.date}</div>
        <div><b>Ώρα:</b> {r.startTime}–{r.endTime}</div>
        <div><b>Κατάσταση:</b> {statusText}</div>
      </div>
    </div>
  );
}
EOF
