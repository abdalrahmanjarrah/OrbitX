export interface Clinic {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  clinic_id: string;
  full_name: string;
  phone: string;
  national_id: string | null;
  email: string | null;
  date_of_birth: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  clinic_id: string;
  patient_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string | null;
  status: "confirmed" | "pending" | "cancelled" | "completed";
  procedure_type:
    | "cleaning"
    | "orthodontics"
    | "root_canal"
    | "extraction"
    | "filling"
    | "whitening"
    | "other";
  notes: string | null;
  created_at: string;
  updated_at: string;
  patients?: Patient;
}

export const STATUS_LABELS: Record<Appointment["status"], string> = {
  confirmed: "مؤكد",
  pending: "بانتظار التأكيد",
  cancelled: "ملغي",
  completed: "مكتمل",
};

export const STATUS_COLORS: Record<Appointment["status"], string> = {
  confirmed: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
};

export const PROCEDURE_LABELS: Record<Appointment["procedure_type"], string> = {
  cleaning: "تنظيف",
  orthodontics: "تقويم",
  root_canal: "سحب عصب",
  extraction: "خلع",
  filling: "حشوة",
  whitening: "تبييض",
  other: "أخرى",
};
