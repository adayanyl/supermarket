"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Início", icon: "🏠" },
  { href: "/scan", label: "Escanear", icon: "📷" },
  { href: "/dispensa", label: "Dispensa", icon: "🧺" },
  { href: "/lista", label: "Lista", icon: "📝" },
  { href: "/produtos", label: "Produtos", icon: "🏷️" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-md items-stretch justify-between px-2">
        {ITEMS.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                active ? "text-accent" : "text-gray-500"
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
