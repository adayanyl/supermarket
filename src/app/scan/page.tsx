import { ScanFlow } from "@/components/ScanFlow";

export default function ScanPage() {
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
