"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "الرئيسية", icon: "🏠" },
  { href: "/patients", label: "المرضى", icon: "👥" },
  { href: "/appointments", label: "الحجوزات", icon: "📅" },
  { href: "/clinics", label: "العيادات", icon: "🏥" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed right-0 top-0 h-full w-64 bg-white border-l border-gray-200 flex-col z-30">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-blue-600">🦷 DentalCare</h1>
          <p className="text-xs text-gray-400 mt-1">إدارة العيادات والحجوزات</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                pathname === item.href
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">v1.0.0</p>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 px-4 z-30 safe-area-bottom">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              pathname === item.href
                ? "text-blue-600"
                : "text-gray-400"
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
