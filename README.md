# Dispensa — compras inteligentes 🧺

PWA para ajudar nas compras de mercado a partir do **cupom fiscal (NFC-e)**:

- 📷 **Lê o QR Code** do cupom, identifica a chave de acesso e tenta buscar os itens na SEFAZ (com **edição manual** sempre disponível).
- 🧺 Controla a **dispensa** (entradas e saídas de estoque).
- 📝 Gera a **lista de compras do mês** pela **média de consumo dos últimos 6 meses** (consumo real, com _fallback_ nas compras) e mostra o **preço da última compra** de cada item.
- ➕ Permite **incluir e remover** itens da lista manualmente.
- 👥 **Login com usuário e senha**, **equipes** (a casa divide a mesma dispensa; o dono convida por link) e **vários emails por conta** (qualquer um serve para entrar).

## Stack

- **Next.js 16** (App Router, TypeScript) — front PWA + rotas de API no mesmo projeto
- **Prisma 7 + SQLite/libSQL** via driver adapter `@prisma/adapter-libsql` (arquivo local no dev; **Turso** em produção)
- **Tailwind CSS v4**
- **@zxing/browser** (leitura de QR na câmera) · **Cheerio** (raspagem da SEFAZ no servidor)
- **Zod** (validação) · **date-fns / date-fns-tz** (mês no fuso de São Paulo) · **Fuse.js** (match fuzzy)
- **Vitest** (testes da lógica de domínio)

## Como rodar

```bash
cp .env.example .env          # DATABASE_URL="file:./dev.db"
npm install                   # gera o client do Prisma no postinstall
npm run db:migrate            # cria o banco e aplica as migrations
npm run db:seed               # (opcional) dados de exemplo + login demo / demo1234
npm run dev                   # http://localhost:3000
```

> **Câmera:** o navegador só libera a câmera em contexto seguro. `localhost` funciona no desktop; no **celular**, sirva por HTTPS (`next dev --experimental-https` ou um túnel). Sem câmera, use o campo **"colar link/chave"** ou **"inserir compra manualmente"**.

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` / `build` / `start` | desenvolvimento / build / produção |
| `npm test` | testes de domínio (Vitest) |
| `npm run typecheck` / `lint` | TypeScript / ESLint |
| `npm run db:migrate` / `db:seed` / `db:studio` / `db:reset` | banco de dados |

## Deploy (Vercel + Turso, grátis)

O runtime usa libSQL: em produção aponta para o **Turso** (SQLite na nuvem) via
`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`. Passo a passo completo em **[DEPLOY.md](./DEPLOY.md)**.

## Arquitetura

```
src/
  lib/domain/      # lógica pura e testável (chave NFC-e, média 6m, matching)
  lib/sefaz/       # leitura do cupom: parser #tabResult, estratégias por UF, registry
  lib/services/    # estoque (saldo), importação (transação), geração da lista
  app/api/         # rotas de mutação + scan
  app/             # páginas (Server Components leem o banco direto)
  components/      # componentes client (câmera, listas interativas)
prisma/            # schema, migrations e seed
```

### Sobre a leitura do cupom (importante)

O QR Code da NFC-e **não contém os produtos** — só um link da SEFAZ + a chave de acesso (44 dígitos). Os itens precisam ser consultados no portal da SEFAZ, e **isso varia por estado** (alguns não retornam os itens). Por isso:

- A raspagem é **best-effort** e roda **no servidor** (CORS + parsing de HTML).
- A UF principal implementada é **Goiás (GO)**; novas UFs entram em `src/lib/sefaz/registry.ts`.
- Quando a consulta não traz itens (estado sem suporte, rede bloqueada, layout diferente), o app **degrada para entrada manual** — continua 100% funcional.

### Cálculo da lista ("os dois")

Para cada produto, em cada um dos 6 meses anteriores: usa o **consumo real** (saídas) quando houver; senão, a **quantidade comprada**. A média é dividida por 6, arredondada pela unidade e, opcionalmente, **descontado o estoque atual** da dispensa.
