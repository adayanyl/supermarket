# App Android (Google Play)

O app Android é o **mesmo site** aberto dentro de um app nativo feito com
[Capacitor](https://capacitorjs.com). O site continua funcionando normalmente na
web; o app só carrega a URL de produção (Vercel). Qualquer deploy do site já
atualiza o app, sem precisar mandar versão nova para a loja.

Arquivos:

| Caminho | O que é |
| --- | --- |
| `capacitor.config.ts` | nome, `appId` e URL que o app abre |
| `android/` | projeto Android Studio (versionado) |
| `mobile/www/` | página "Sem conexão" exibida quando a URL não carrega |
| `mobile/assets/` | ícone e splash de origem (regenerar: passo 6) |
| `src/app/privacidade` | política de privacidade pública (exigida pela Play) |

> **iOS depois:** o mesmo `capacitor.config.ts` serve. Num Mac com Xcode:
> `npm i @capacitor/ios && npx cap add ios && npx cap open ios`.

---

## 0. Antes de tudo (uma vez)

1. **Site no ar** em HTTPS (ver `DEPLOY.md`). Anote a URL, hoje `https://supermarket-bice-rho.vercel.app`.
2. Edite o e-mail de contato em `src/app/privacidade/page.tsx` e faça deploy.
   Confira que `https://SUA-URL/privacidade` abre **sem login**.
3. Decida o **`appId`** em `capacitor.config.ts` (hoje `app.dispensa.compras`).
   Ele vira o nome do pacote na Play e **nunca mais pode mudar**. Se trocar, troque
   também `namespace`/`applicationId` em `android/app/build.gradle`, o pacote Java em
   `android/app/src/main/java/...` e `android/app/src/main/res/values/strings.xml`.
4. Instale o **Android Studio** (traz o SDK e o JDK). Node 20+ e `npm install` no projeto.

## 1. Apontar o app para o site

```bash
# Linux/macOS
CAP_SERVER_URL=https://supermarket-bice-rho.vercel.app npm run android:sync
# Windows (PowerShell)
$env:CAP_SERVER_URL="https://supermarket-bice-rho.vercel.app"; npm run android:sync
```

A URL de produção já é o padrão no `capacitor.config.ts`, então `npm run android:sync`
sozinho basta; a variável só serve para apontar para outro endereço (ex.: um preview).
Repita o `android:sync` sempre que mudar `capacitor.config.ts` ou atualizar o Capacitor.

Teste num celular (modo desenvolvedor + depuração USB) ou emulador:

```bash
npm run android:open   # abre no Android Studio → botão ▶ Run
```

Confira: abre o site, a câmera lê o QR do cupom (o Android pede permissão), voltar
funciona, e sem internet aparece a tela "Sem conexão".

## 2. Criar a chave de upload (uma vez — guarde com a vida!)

```bash
keytool -genkeypair -v -keystore dispensa-upload.jks -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

(O `keytool` vem com o Android Studio: no Windows fica em
`C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe`.)

- Guarde o `.jks` e a senha **fora do repositório** (gerenciador de senhas + backup).
- Copie `android/keystore.properties.example` para `android/keystore.properties` e
  preencha caminho e senhas. Esse arquivo e o `.jks` já estão no `.gitignore`.
- Com o **Play App Signing** (padrão), o Google guarda a chave final; se perder a de
  upload dá para pedir reset ao suporte, mas é demorado.

## 3. Gerar o AAB assinado

Antes de cada envio, **suba o `versionCode`** em `android/app/build.gradle`
(1 → 2 → 3...) e, se quiser, o `versionName` (1.0.0 → 1.0.1).

```bash
npm run android:sync
cd android
./gradlew bundleRelease          # Windows: gradlew.bat bundleRelease
```

Saída: `android/app/build/outputs/bundle/release/app-release.aab`.

Alternativa sem terminal: Android Studio → **Build → Generate Signed App Bundle / APK →
Android App Bundle**, escolha o `.jks`.

## 4. Conta e app no Play Console

1. Crie a conta em <https://play.google.com/console/signup> — taxa única de **US$ 25**.
   Conta **pessoal** exige verificação de identidade (documento) e um celular Android
   com o app Play Console.
2. **Criar app** → nome "Dispensa", idioma pt-BR, App, Gratuito.
3. Em **Painel → Configurar o app**, preencha:
   - **Política de privacidade**: `https://SUA-URL/privacidade`
   - **Acesso ao app**: se o app exigir login, dê um usuário/senha de teste para a revisão.
   - **Anúncios**: não contém.
   - **Classificação de conteúdo**: questionário (categoria Utilitário/Produtividade).
   - **Público-alvo**: 18+ (evita exigências de apps infantis).
   - **Segurança dos dados**: coleta *Compras/histórico de compras* (funcionalidade do app,
     não compartilhado, criptografado em trânsito). Se houver contas de usuário, marque
     também *E-mail/nome* e informe **como excluir a conta** (a Play exige um link ou
     caminho para o usuário pedir a exclusão; o e-mail da página de privacidade serve
     para começar).
   - **App de governo / financeiro / saúde**: não.
4. **Página da loja**: descrição curta (80 caracteres) e completa, ícone 512×512
   (`mobile/assets/icon-only.png` redimensionado), **gráfico de destaque 1024×500** e
   pelo menos **2 capturas de tela** do celular.

## 5. Teste fechado obrigatório (contas pessoais novas)

Contas pessoais criadas depois de nov/2023 só podem publicar em produção depois de um
**teste fechado com pelo menos 12 testadores inscritos por 14 dias seguidos**.

1. **Testar → Teste fechado → Criar faixa** (ou use a faixa "Alpha").
2. **Testadores**: crie uma lista de e-mails (contas Google) com **12 ou mais** pessoas.
   Recomendo 14–15 para ter folga se alguém sair.
3. **Criar versão** → envie o `app-release.aab` → aceite o Play App Signing → salvar →
   **Enviar para revisão**.
4. Depois de aprovado, copie o **link de participação** e mande aos testadores. Cada um
   precisa abrir o link, **aceitar participar** e **instalar** o app. Os 14 dias contam a
   partir de quando houver 12 inscritos, e eles precisam continuar inscritos até o fim.
5. Peça que usem de verdade (ler um cupom, mexer na lista) e mandem feedback.
6. Passados os 14 dias, em **Painel → Solicitar acesso à produção**, responda o
   questionário (como recrutou testadores, o que mudou com o feedback etc.).
   A análise leva até ~7 dias.

## 6. Produção e atualizações

- Aprovado o acesso: **Produção → Criar versão** → reutilize o mesmo AAB (ou um novo
  com `versionCode` maior) → **Enviar para revisão**.
- **Mudanças no site** (telas, regras, banco): só faça deploy na Vercel. O app já abre
  a versão nova.
- **Mudanças nativas** (ícone, nome, permissões, versão do Capacitor/Android): gere um
  AAB novo com `versionCode` maior e envie.
- Ícone/splash: edite os PNGs em `mobile/assets/` e rode
  `npx @capacitor/assets generate --android --assetPath mobile/assets --iconBackgroundColor '#0f766e' --splashBackgroundColor '#f5f6f8' --splashBackgroundColorDark '#111827'`.
- A Play exige `targetSdk` recente todo ano (hoje 36). Atualize o Capacitor
  (`npm i @capacitor/core@latest @capacitor/android@latest @capacitor/cli@latest && npx cap sync`)
  quando o Play Console avisar.
