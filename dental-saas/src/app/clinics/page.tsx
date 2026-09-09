"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/components/Sidebar";
import type { Clinic } from "@/types";

export default function ClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });

  const supabase = createClient();

  async function loadClinics() {
    const { data } = await supabase.from("clinics").select("*").order("created_at", { ascending: false });
    setClinics((data as Clinic[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { loadClinics(); }, []);

  async function handleSave() {
    if (!form.name || !form.email) return;
    await supabase.from("clinics").insert(form);
    setForm({ name: "", email: "", phone: "", address: "" });
    setShowForm(false);
    loadClinics();
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد؟ سيتم حذف جميع المرضى والحجوزات المرتبطة")) return;
    await supabase.from("clinics").delete().eq("id", id);
    loadClinics();
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:mr-64 p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">العيادات</h1>
              <p className="text-sm text-gray-500">{clinics.length} عيادة مسجلة</p>
            </div>
            <button
              onClick={() => { setForm({ name: "", email: "", phone: "", address: "" }); setShowForm(!showForm); }}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + عيادة جديدة
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
              <h3 className="font-bold text-gray-900 mb-4">إضافة عيادة جديدة</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="اسم العيادة / الطبيب *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="email" placeholder="البريد الإلكتروني *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="tel" placeholder="رقم الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="text" placeholder="العنوان" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700">حفظ</button>
                <button onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100">إلغاء</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => <div key={i} className="bg-white rounded-2xl h-36 animate-pulse" />)}
            </div>
          ) : clinics.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400">لا توجد عيادات بعد</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clinics.map((clinic) => (
                <div key={clinic.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 text-2xl">
                      🏥
                    </div>
                    <button onClick={() => handleDelete(clinic.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 text-sm">حذف</button>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">{clinic.name}</h3>
                  <div className="mt-3 space-y-1.5 text-sm text-gray-500">
                    <p>📧 {clinic.email}</p>
                    {clinic.phone && <p>📞 {clinic.phone}</p>}
                    {clinic.address && <p>📍 {clinic.address}</p>}
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
