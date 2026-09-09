import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ISO date (yyyy-mm-dd) of the Monday that starts the current local week.
export function getWeekStartISO(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sunday ... 6=Saturday
  const daysSinceMonday = (day + 6) % 7; // Monday=0 ... Sunday=6
  d.setDate(d.getDate() - daysSinceMonday);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function getWeekLabel(date: Date = new Date()): string {
  const start = new Date(getWeekStartISO(date));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return start.toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
}

