<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Projeto: Dispensa

PWA de compras: lê o cupom fiscal (NFC-e), controla a dispensa e gera a lista mensal.

## Convenções

- **Banco**: Prisma 7 + SQLite via driver adapter **libSQL** (`@prisma/adapter-libsql`) em `src/lib/db.ts` — produção no **Turso** (`TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`), dev em `file:./dev.db`. Não há `url` no `schema.prisma` (fica no `prisma.config.ts`). Migrations rodam local (SQLite) e são aplicadas no Turso via `turso db shell` (o Prisma CLI não migra contra `libsql://`). SQLite não suporta `enum` no Prisma — `StockMovement.type` é `String` ("IN"/"OUT"). Client gerado em `src/generated/prisma` (gitignored; `postinstall` regenera). Deploy: ver `DEPLOY.md`.
- **Domínio puro** em `src/lib/domain/**` (sem Next/Prisma) — é onde ficam os testes (Vitest). Rode `npm test`.
- **Datas/mês**: sempre no fuso `America/Sao_Paulo` (helpers em `domain/shopping-list.ts`).
- **Páginas** que leem o banco são Server Components com `export const dynamic = "force-dynamic"`. Mutações passam por rotas em `app/api/**` (validadas com Zod) chamadas via `src/lib/client.ts`.
- **SEFAZ**: raspagem best-effort no servidor; estratégias por UF em `src/lib/sefaz/`. Sempre degrade para entrada manual. Teste parsers com fixtures (sem rede).

## Antes de finalizar

`npm run typecheck && npm run lint && npm test && npm run build` devem passar.
