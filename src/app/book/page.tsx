"use client";

import { useEffect, useMemo, useState } from "react";

type Slot = { startTime: string; endTime: string };
type Day = { date: string; slots: Slot[] };

export default function BookPage() {
  const [loading, setLoading] = useState(true);
  const [periodId, setPeriodId] = useState<string>("");
  const [days, setDays] = useState<Day[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg("");
      const res = await fetch("/api/availability", { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) {
        setMsg("Δεν υπάρχει διαθέσιμη περίοδος αυτή τη στιγμή.");
        setLoading(false);
        return;
      }
      setPeriodId(data.periodId);
      setDays(data.dates || []);
      setSelectedDate(data.dates?.[0]?.date || "");
      setSelectedSlot(null);
      setLoading(false);
    })();
  }, []);

  const slotsForDate = useMemo(() => {
    const d = days.find(x => x.date === selectedDate);
    return d?.slots || [];
  }, [days, selectedDate]);

  async function submit() {
    setMsg("");
    if (!periodId) return setMsg("Λείπει περίοδος.");
    if (!selectedDate) return setMsg("Διάλεξε ημερομηνία.");
    if (!selectedSlot) return setMsg("Διάλεξε ώρα.");
    if (!customerName || !customerEmail || !customerPhone) return setMsg("Συμπλήρωσε όνομα, email, τηλέφωνο.");

    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        periodId,
        date: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        customerName,
        customerEmail,
        customerPhone,
        customerNote,
      }),
    });

    const data = await res.json();
    if (!data.ok) return setMsg("Κάτι πήγε στραβά. Δοκίμασε ξανά.");
    window.location.href = `/status/${data.publicCode}`;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">Κλείσε Ραντεβού</h1>

      <div className="rounded-xl border p-4 space-y-3">
        <div className="text-sm text-gray-600">
          Διεύθυνση: <b>{process.env.NEXT_PUBLIC_SHOWROOM_ADDRESS || "Θηβών 183 & Β. Ηπείρου 3, Νίκαια"}</b>
        </div>

        {loading ? (
          <div>Φόρτωση διαθεσιμότητας...</div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="block font-semibold">Ημερομηνία</label>
              <select
                className="border rounded-lg p-2 w-full"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedSlot(null);
                }}
              >
                {days.map((d) => (
                  <option key={d.date} value={d.date}>
                    {d.date}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block font-semibold">Ώρα (2 ώρες)</label>
              <div className="grid grid-cols-2 gap-2">
                {slotsForDate.length === 0 && <div className="text-sm text-gray-600">Δεν υπάρχουν διαθέσιμες ώρες.</div>}
                {slotsForDate.map((s) => {
                  const active = selectedSlot?.startTime === s.startTime;
                  return (
                    <button
                      type="button"
                      key={s.startTime}
                      className={`border rounded-lg p-2 text-left ${active ? "bg-black text-white" : ""}`}
                      onClick={() => setSelectedSlot(s)}
                    >
                      {s.startTime}–{s.endTime}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-semibold">Στοιχεία</label>
              <input className="border rounded-lg p-2 w-full" placeholder="Ονοματεπώνυμο" value={customerName} onChange={e=>setCustomerName(e.target.value)} />
              <input className="border rounded-lg p-2 w-full" placeholder="Email" value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)} />
              <input className="border rounded-lg p-2 w-full" placeholder="Τηλέφωνο" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} />
              <textarea className="border rounded-lg p-2 w-full" placeholder="Σημείωση (προαιρετικό)" value={customerNote} onChange={e=>setCustomerNote(e.target.value)} />
            </div>

            <button className="rounded-lg bg-black text-white px-4 py-2" onClick={submit}>
              Υποβολή αιτήματος
            </button>
          </>
        )}

        {msg && <div className="text-sm text-red-600">{msg}</div>}
      </div>
    </div>
  );
}
