import "dotenv/config";

import { normalize } from "../src/lib/domain/matching";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/domain/password";
import { confirmPurchase, type ConfirmItemInput } from "../src/lib/services/import";

const STORE = { cnpj: "12345678000199", name: "SUPERMERCADO EXEMPLO LTDA", uf: "GO", city: "Goiânia" };

// Catálogo base; quantidade varia um pouco por mês para a média ficar realista.
const CATALOG: Array<{ desc: string; unit: string; ean?: string; price: number; qty: number }> = [
  { desc: "ARROZ TIO JOAO 5KG", unit: "UN", ean: "7891234500015", price: 25.9, qty: 2 },
  { desc: "FEIJAO CARIOCA 1KG", unit: "UN", ean: "7891234500022", price: 8.49, qty: 3 },
  { desc: "LEITE INTEGRAL 1L", unit: "UN", ean: "7891234500039", price: 4.99, qty: 12 },
  { desc: "CAFE TORRADO 500G", unit: "UN", price: 14.9, qty: 2 },
  { desc: "SABAO EM PO 1KG", unit: "UN", price: 11.5, qty: 1 },
  { desc: "BANANA PRATA", unit: "KG", price: 4.0, qty: 1.5 },
  { desc: "DETERGENTE NEUTRO 500ML", unit: "UN", price: 2.79, qty: 4 },
];

function monthsAgo(n: number, day = 15): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - n, day, 12);
}

function vary(base: number, factor: number): number {
  const v = base * factor;
  return Number.isInteger(base) ? Math.max(1, Math.round(v)) : Math.round(v * 10) / 10;
}

function buildAccessKey(index: number): string {
  return ("52" + "9".repeat(40) + String(index)).slice(0, 44).padEnd(44, "0");
}

async function clear() {
  await prisma.shoppingListItem.deleteMany();
  await prisma.shoppingList.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.productAlias.deleteMany();
  await prisma.product.deleteMany();
  await prisma.store.deleteMany();
  await prisma.session.deleteMany();
  await prisma.teamInvite.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.userEmail.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
}

// Login de exemplo: usuário "demo" (ou demo@dispensa.local), senha "demo1234".
async function createDemoTeam(): Promise<string> {
  const team = await prisma.team.create({ data: { name: "Casa Demo" } });
  await prisma.user.create({
    data: {
      name: "Demo",
      username: "demo",
      passwordHash: await hashPassword("demo1234"),
      emails: { create: { email: "demo@dispensa.local", isPrimary: true } },
      memberships: { create: { teamId: team.id, role: "owner" } },
    },
  });
  return team.id;
}

async function main() {
  console.log("Limpando dados...");
  await clear();
  const teamId = await createDemoTeam();

  console.log("Criando compras dos últimos 6 meses...");
  // Fatores de variação por mês (do mais antigo ao mais recente).
  const factors = [0.8, 1.2, 1.0, 0.9, 1.1, 1.0];
  for (let i = 0; i < factors.length; i++) {
    const monthsBack = 6 - i; // 6,5,4,3,2,1 meses atrás
    const purchasedAt = monthsAgo(monthsBack);
    const items: ConfirmItemInput[] = CATALOG.map((c) => {
      const quantity = vary(c.qty, factors[i]);
      const unitPrice = Math.round(c.price * (0.97 + 0.06 * Math.random()) * 100) / 100;
      return {
        rawDescription: c.desc,
        ean: c.ean ?? null,
        quantity,
        unit: c.unit,
        unitPrice,
        totalPrice: Math.round(quantity * unitPrice * 100) / 100,
      };
    });
    const totalValue = Math.round(items.reduce((s, it) => s + it.totalPrice, 0) * 100) / 100;
    await confirmPurchase(teamId, {
      accessKey: buildAccessKey(i),
      uf: "GO",
      importStatus: "auto",
      purchasedAt,
      totalValue,
      store: STORE,
      items,
    });
  }

  // Consumo real (saídas) de todos os produtos todo mês -> exercita o cálculo
  // "os dois" e mantém um estoque realista. No mês mais recente consumimos só
  // parte, deixando um saldo em dispensa.
  console.log("Registrando consumo (saídas)...");
  const allProducts = await prisma.product.findMany();
  const idByName = new Map(allProducts.map((p) => [p.normalizedName, p.id]));
  const lastIndex = factors.length - 1;
  for (const c of CATALOG) {
    const productId = idByName.get(normalize(c.desc));
    if (!productId) continue;
    for (let i = 0; i < factors.length; i++) {
      const bought = vary(c.qty, factors[i]);
      const ratio = i === lastIndex ? 0.4 : 1; // deixa saldo no mês mais recente
      const consumed =
        c.unit === "KG"
          ? Math.round(bought * ratio * 10) / 10
          : Math.max(1, Math.round(bought * ratio));
      await prisma.stockMovement.create({
        data: {
          productId,
          type: "OUT",
          quantity: consumed,
          unit: c.unit,
          occurredAt: monthsAgo(6 - i, 20),
          reason: "consumption",
        },
      });
    }
  }

  const [products, purchases, movements] = await Promise.all([
    prisma.product.count(),
    prisma.purchase.count(),
    prisma.stockMovement.count(),
  ]);
  console.log(`Pronto: ${products} produtos, ${purchases} compras, ${movements} movimentações.`);
  console.log(`Login: usuário "demo" (ou demo@dispensa.local), senha "demo1234".`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
