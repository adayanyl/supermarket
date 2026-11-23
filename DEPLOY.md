# Deploy na Vercel (grátis) com Turso

O app roda em serverless na Vercel; o banco fica no **Turso** (SQLite na nuvem,
plano grátis). O runtime usa libSQL via `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`.

## 1. Criar o banco no Turso

```bash
# instalar a CLI
curl -sSfL https://get.tur.so/install.sh | bash
turso auth signup          # ou: turso auth login

# criar o banco
turso db create dispensa

# aplicar o schema (usa as migrations já versionadas no repo)
cat prisma/migrations/*/migration.sql | turso db shell dispensa

# pegar URL e token (guarde os dois)
turso db show dispensa --url       # libsql://dispensa-...turso.io
turso db tokens create dispensa    # eyJ... (token)
```

> Opcional — popular com dados de exemplo: coloque `TURSO_DATABASE_URL` e
> `TURSO_AUTH_TOKEN` no seu `.env` local e rode `npm run db:seed`.

## 2. Levar o código para o GitHub

O trabalho está no branch `claude/youthful-cerf-sMnS5`. Para produção, faça o
merge na `main` (ou, no passo 3, aponte a Vercel para este branch).

## 3. Importar na Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → importe `agilerdc/supermarket`.
2. Framework **Next.js** (detectado automaticamente). Build e Install: padrão.
3. Em **Environment Variables**, adicione:
   - `TURSO_DATABASE_URL` = a URL `libsql://...`
   - `TURSO_AUTH_TOKEN` = o token
4. **Deploy**. No fim você recebe uma URL HTTPS pública — a câmera de QR funciona
   porque é HTTPS, e dá para "instalar" o PWA na tela inicial do celular.

## Atualizações de schema

Ao mudar o `schema.prisma`:

```bash
npm run db:migrate                                           # cria a migration (local)
turso db shell dispensa < prisma/migrations/<NOVA>/migration.sql
git push                                                     # Vercel redeploya
```

## Login e equipes (migration `auth_teams`)

> **Se o login/cadastro der "O banco de dados está desatualizado" (ou 500)**, a
> migration não foi aplicada no Turso. Confira e aplique:
>
> ```bash
> turso db shell dispensa ".tables"   # precisa listar User, Team, Session...
> turso db shell dispensa < prisma/migrations/20261123120536_auth_teams/migration.sql
> ```
>
> Rode o `auth_teams` **uma vez só** (não use o `cat prisma/migrations/*` do
> passo 1 num banco que já existe).

Ao aplicar a migration `*_auth_teams` num banco que já tem dados, tudo o que
existia vai para a equipe **"Minha casa"**. A **primeira pessoa que se
cadastrar** vira dona dessa equipe e encontra os dados como estavam; quem se
cadastrar depois ganha uma equipe nova (ou entra pela equipe do convite).

## Notas

- O client do Prisma é regenerado no build (`postinstall`) — não commitamos `src/generated`.
- A leitura automática do cupom faz requisições à SEFAZ **no servidor** (Node runtime,
  até 30s) e sempre degrada para entrada manual.
- Migrations não rodam contra `libsql://` pelo Prisma CLI; por isso aplicamos o
  `migration.sql` via `turso db shell`.
