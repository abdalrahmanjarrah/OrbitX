import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DentalCare - إدارة العيادات",
  description: "نظام إدارة عيادات الأسنان والحجوزات",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
