import "./globals.css";

import type { Metadata } from "next";

import AppShellHeader from "@/components/app-shell-header";
import { CalendarPattern } from "@/components/calendar-pattern";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Agendou-manager",
  description: "Gestão de agendamento para o salão de beleza Agendou",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppShellHeader />
        <main className="relative min-h-[calc(100vh-64px)]">
          <CalendarPattern variant="dense" opacity="opacity-[0.07]" />
          <div className="relative z-10">{children}</div>
        </main>
        <div className="flex flex-wrap gap-2">
          <Toaster className="toaster-center w-full" />
        </div>
      </body>
    </html>
  );
}
