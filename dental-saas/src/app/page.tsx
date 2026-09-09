"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/components/Sidebar";
import type { Appointment, Patient } from "@/types";
import { STATUS_LABELS, STATUS_COLORS, PROCEDURE_LABELS } from "@/types";

export default function Dashboard() {
  const [stats, setStats] = useState({ patients: 0, appointments: 0, today: 0, pending: 0 });
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const [{ count: pCount }, { count: aCount }, { count: tCount }, { count: pendCount }] =
        await Promise.all([
          supabase.from("patients").select("*", { count: "exact", head: true }),
          supabase.from("appointments").select("*", { count: "exact", head: true }),
          supabase
            .from("appointments")
            .select("*", { count: "exact", head: true })
            .eq("appointment_date", new Date().toISOString().split("T")[0]),
          supabase
            .from("appointments")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending"),
        ]);

      setStats({
        patients: pCount ?? 0,
        appointments: aCount ?? 0,
        today: tCount ?? 0,
        pending: pendCount ?? 0,
      });

      const { data } = await supabase
        .from("appointments")
        .select("*, patients(full_name, phone)")
        .order("appointment_date", { ascending: false })
        .limit(5);

      setRecentAppointments((data as Appointment[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const cards = [
    { label: "المرضى", value: stats.patients, color: "bg-blue-500", icon: "👥", href: "/patients" },
    { label: "إجمالي الحجوزات", value: stats.appointments, color: "bg-purple-500", icon: "📅", href: "/appointments" },
    { label: "حجوزات اليوم", value: stats.today, color: "bg-green-500", icon: "📋", href: "/appointments" },
    { label: "بانتظار التأكيد", value: stats.pending, color: "bg-yellow-500", icon: "⏳", href: "/appointments" },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:mr-64 p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">مرحباً بك 👋</h1>
            <p className="text-gray-500 mt-1">نظرة عامة على عيادتك</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-5 animate-pulse h-28" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {cards.map((card) => (
                  <Link
                    key={card.label}
                    href={card.href}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                  >
                    <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center text-white text-lg mb-3`}>
                      {card.icon}
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                    <p className="text-sm text-gray-500 mt-1">{card.label}</p>
                  </Link>
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-gray-900">آخر الحجوزات</h2>
                  <Link href="/appointments" className="text-sm text-blue-600 hover:underline">
                    عرض الكل
                  </Link>
                </div>
                <div className="divide-y divide-gray-50">
                  {recentAppointments.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">لا توجد حجوزات بعد</div>
                  ) : (
                    recentAppointments.map((appt) => (
                      <div key={appt.id} className="px-6 py-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {(appt.patients as any)?.full_name ?? "مريض"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {PROCEDURE_LABELS[appt.procedure_type]} · {appt.appointment_date}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[appt.status]}`}>
                          {STATUS_LABELS[appt.status]}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
