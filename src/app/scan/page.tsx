import { ScanFlow } from "@/components/ScanFlow";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ScanPage() {
  await requireAuth();
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Escanear cupom</h1>
        <p className="text-sm text-gray-500">Leia o QR Code da NFC-e ou cole o link/chave.</p>
      </header>
      <ScanFlow />
    </div>
  );
}
