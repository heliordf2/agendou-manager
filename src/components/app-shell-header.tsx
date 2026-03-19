"use client";

import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/manager", label: "Manager" },
  { href: "/database", label: "Database" },
  { href: "/storage", label: "Storage" },
];

export default function AppShellHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[#d8d6d3] bg-[#f1efef]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1880px] items-center justify-between gap-2 px-3 py-3 md:gap-3 md:px-6 md:py-3.5">
        <Link href="/" className="flex items-center gap-2.5 md:gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#313845] text-white shadow-[0_6px_14px_rgba(24,30,42,0.22)] md:h-11 md:w-11">
            <CalendarDays className="h-5 w-5 md:h-6 md:w-6" />
          </span>
          <span className="text-xl font-bold text-[#2d3440] sm:text-2xl">Agendou</span>
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 md:gap-2.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:py-2 sm:text-sm md:rounded-2xl md:px-4.5 md:py-2.5 md:text-base",
                  isActive
                    ? "border-[#313845] bg-[#313845] text-[#f5f5f5]"
                    : "border-[#4b4a49] bg-[#efeded] text-[#302f2f] hover:bg-[#e7e4e4]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
