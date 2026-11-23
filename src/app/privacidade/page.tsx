import type { Metadata } from "next";

// Página pública exigida pela Google Play (o app usa a câmera).
// Troque pelo e-mail de contato que aparecerá na loja.
const CONTATO = "contato@exemplo.com";
const ATUALIZADA_EM = "23/11/2026";

export const metadata: Metadata = {
  title: "Política de privacidade — Dispensa",
};

export default function PrivacidadePage() {
  return (
    <article className="space-y-4 text-sm leading-relaxed">
      <h1 className="text-xl font-semibold">Política de privacidade</h1>
      <p className="text-xs opacity-70">Atualizada em {ATUALIZADA_EM}</p>

      <section className="space-y-2">
        <h2 className="font-semibold">O que coletamos</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Dados das suas compras</strong>: itens, quantidades, preços, loja e data dos cupons
            fiscais (NFC-e) que você lê ou digita, e as entradas e saídas da sua dispensa.
          </li>
          <li>
            <strong>Câmera</strong>: usada só para ler o QR Code do cupom, no próprio aparelho. Não
            gravamos nem enviamos fotos ou vídeos.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Como usamos</h2>
        <p>
          Os dados servem apenas para mostrar sua dispensa e gerar sua lista de compras. Para buscar os
          itens de um cupom, o servidor consulta o portal público da SEFAZ com a chave de acesso do
          cupom. Não vendemos nem compartilhamos seus dados com terceiros para publicidade.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Onde ficam</h2>
        <p>
          Em servidores de hospedagem e banco de dados na nuvem contratados para rodar o app, com
          conexão criptografada (HTTPS).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Seus direitos (LGPD)</h2>
        <p>
          Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento pelo e-mail{" "}
          <a className="underline" href={`mailto:${CONTATO}`}>
            {CONTATO}
          </a>
          .
        </p>
      </section>
    </article>
  );
}
