"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/components/Sidebar";
import type { Patient } from "@/types";

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ full_name: "", phone: "", national_id: "", email: "", notes: "" });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const supabase = createClient();

  async function loadPatients() {
    const { data } = await supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false });
    setPatients((data as Patient[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { loadPatients(); }, []);

  async function handleSave() {
    if (!form.full_name || !form.phone) return;
    if (editingId) {
      await supabase.from("patients").update(form).eq("id", editingId);
    } else {
      await supabase.from("patients").insert(form);
    }
    setForm({ full_name: "", phone: "", national_id: "", email: "", notes: "" });
    setEditingId(null);
    setShowForm(false);
    loadPatients();
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    await supabase.from("patients").delete().eq("id", id);
    loadPatients();
  }

  function handleEdit(patient: Patient) {
    setForm({
      full_name: patient.full_name,
      phone: patient.phone,
      national_id: patient.national_id ?? "",
      email: patient.email ?? "",
      notes: patient.notes ?? "",
    });
    setEditingId(patient.id);
    setShowForm(true);
  }

  const filtered = patients.filter(
    (p) =>
      p.full_name.includes(search) ||
      p.phone.includes(search) ||
      (p.national_id?.includes(search) ?? false)
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:mr-64 p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">المرضى</h1>
              <p className="text-sm text-gray-500">{patients.length} مريض مسجل</p>
            </div>
            <button
              onClick={() => { setForm({ full_name: "", phone: "", national_id: "", email: "", notes: "" }); setEditingId(null); setShowForm(!showForm); }}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + مريض جديد
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
              <h3 className="font-bold text-gray-900 mb-4">{editingId ? "تعديل المريض" : "إضافة مريض جديد"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="الاسم الكامل *"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="tel"
                  placeholder="رقم الهاتف *"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="الرقم الوطني"
                  value={form.national_id}
                  onChange={(e) => setForm({ ...form, national_id: e.target.value })}
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="email"
                  placeholder="البريد الإلكتروني"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  placeholder="ملاحظات"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700">
                  {editingId ? "تحديث" : "حفظ"}
                </button>
                <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100">
                  إلغاء
                </button>
              </div>
            </div>
          )}

          <div className="mb-4">
            <input
              type="text"
              placeholder="🔍  بحث بالاسم أو الهاتف أو الرقم الوطني..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400">
              لا يوجد مرضى{search ? " يطابقون البحث" : ""}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((patient) => (
                <div key={patient.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                      {patient.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{patient.full_name}</p>
                      <p className="text-sm text-gray-500">{patient.phone}</p>
                      {patient.national_id && <p className="text-xs text-gray-400">رقم وطني: {patient.national_id}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(patient)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 text-sm">تعديل</button>
                    <button onClick={() => handleDelete(patient.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 text-sm">حذف</button>
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
