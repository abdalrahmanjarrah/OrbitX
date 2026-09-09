"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/components/Sidebar";
import type { Appointment, Patient } from "@/types";
import { STATUS_LABELS, STATUS_COLORS, PROCEDURE_LABELS } from "@/types";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    patient_id: "",
    appointment_date: "",
    start_time: "09:00",
    procedure_type: "cleaning" as Appointment["procedure_type"],
    notes: "",
  });

  const supabase = createClient();

  async function loadData() {
    const [apptRes, patRes] = await Promise.all([
      supabase
        .from("appointments")
        .select("*, patients(full_name, phone)")
        .order("appointment_date", { ascending: false }),
      supabase.from("patients").select("*").order("full_name"),
    ]);
    setAppointments((apptRes.data as Appointment[]) ?? []);
    setPatients((patRes.data as Patient[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function handleCreate() {
    if (!form.patient_id || !form.appointment_date) return;
    await supabase.from("appointments").insert({
      patient_id: form.patient_id,
      appointment_date: form.appointment_date,
      start_time: form.start_time,
      procedure_type: form.procedure_type,
      notes: form.notes || null,
      status: "pending",
    });
    setForm({ patient_id: "", appointment_date: "", start_time: "09:00", procedure_type: "cleaning", notes: "" });
    setShowForm(false);
    loadData();
  }

  async function updateStatus(id: string, status: Appointment["status"]) {
    await supabase.from("appointments").update({ status }).eq("id", id);
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    await supabase.from("appointments").delete().eq("id", id);
    loadData();
  }

  const filtered = appointments.filter((a) => filter === "all" || a.status === filter);

  const filterButtons = [
    { key: "all", label: "الكل" },
    { key: "pending", label: "بانتظار" },
    { key: "confirmed", label: "مؤكد" },
    { key: "completed", label: "مكتمل" },
    { key: "cancelled", label: "ملغي" },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:mr-64 p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">الحجوزات</h1>
              <p className="text-sm text-gray-500">{appointments.length} حجز</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + حجز جديد
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
              <h3 className="font-bold text-gray-900 mb-4">حجز موعد جديد</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={form.patient_id}
                  onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">اختر المريض *</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} - {p.phone}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={form.appointment_date}
                  onChange={(e) => setForm({ ...form, appointment_date: e.target.value })}
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={form.procedure_type}
                  onChange={(e) => setForm({ ...form, procedure_type: e.target.value as Appointment["procedure_type"] })}
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {Object.entries(PROCEDURE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <textarea
                  placeholder="ملاحظات"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={handleCreate} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700">
                  حجز الموعد
                </button>
                <button onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100">
                  إلغاء
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {filterButtons.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  filter === f.key
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400">لا توجد حجوزات</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((appt) => (
                <div key={appt.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-900">
                        {(appt.patients as any)?.full_name ?? "مريض"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(appt.patients as any)?.phone}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[appt.status]}`}>
                      {STATUS_LABELS[appt.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <span>📅 {appt.appointment_date}</span>
                    <span>🕐 {appt.start_time?.slice(0, 5)}</span>
                    <span>🦷 {PROCEDURE_LABELS[appt.procedure_type]}</span>
                  </div>
                  {appt.notes && <p className="text-xs text-gray-400 mb-3">{appt.notes}</p>}
                  <div className="flex gap-2 flex-wrap">
                    {appt.status === "pending" && (
                      <button onClick={() => updateStatus(appt.id, "confirmed")} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100">
                        تأكيد
                      </button>
                    )}
                    {appt.status !== "completed" && appt.status !== "cancelled" && (
                      <button onClick={() => updateStatus(appt.id, "completed")} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100">
                        إكمال
                      </button>
                    )}
                    {appt.status !== "cancelled" && appt.status !== "completed" && (
                      <button onClick={() => updateStatus(appt.id, "cancelled")} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100">
                        إلغاء
                      </button>
                    )}
                    <button onClick={() => handleDelete(appt.id)} className="px-3 py-1.5 text-gray-400 rounded-lg text-xs font-medium hover:bg-gray-100">
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
