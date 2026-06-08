import type { Metadata, Viewport } from "next";

import { BottomNav } from "@/components/BottomNav";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

import "./globals.css";

export const metadata: Metadata = {
  title: "Dispensa — compras inteligentes",
  description: "Leia o cupom fiscal, controle a dispensa e gere a lista de compras do mês.",
  applicationName: "Dispensa",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Dispensa" },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <main className="mx-auto w-full max-w-md px-4 pt-5 pb-28">{children}</main>
        <BottomNav />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
