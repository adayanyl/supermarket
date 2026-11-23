import type { CapacitorConfig } from "@capacitor/cli";

/**
 * App nativo (Android hoje, iOS depois) que abre o site publicado.
 *
 * O app Next.js depende de servidor (Server Components + rotas de API + banco),
 * então não dá para exportar estático: o WebView carrega a URL de produção.
 * Web e app usam o mesmo código e o mesmo banco.
 *
 * Defina a URL ao sincronizar:  CAP_SERVER_URL=https://seu-app.vercel.app npx cap sync
 */
const serverUrl = process.env.CAP_SERVER_URL ?? "https://SEU-APP.vercel.app";

const config: CapacitorConfig = {
  // ATENÇÃO: o appId vira o "nome do pacote" na Google Play e não pode mudar depois do 1º upload.
  appId: "app.dispensa.compras",
  appName: "Dispensa",
  // Página mostrada só se a URL acima não carregar (sem internet etc.).
  webDir: "mobile/www",
  server: {
    url: serverUrl,
    errorPath: "offline.html",
    // Navegação para outros domínios abre no navegador do sistema.
    allowNavigation: [new URL(serverUrl).host],
  },
  android: {
    backgroundColor: "#f5f6f8",
  },
};

export default config;
