import { ShoppingListView } from "@/components/ShoppingListView";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { monthKeyOf } from "@/lib/domain/shopping-list";

export const dynamic = "force-dynamic";

export default async function ListaPage() {
  const { team } = await requireAuth();
  const list = await prisma.shoppingList.findFirst({
    where: { teamId: team.id },
    orderBy: { periodMonth: "desc" },
    include: {
      items: {
        include: { product: true },
        orderBy: [{ included: "desc" }, { suggestedQuantity: "desc" }],
      },
    },
  });

  const data = list
    ? {
        id: list.id,
        periodMonth: list.periodMonth.toISOString(),
        items: list.items.map((i) => ({
          id: i.id,
          name: i.product?.name ?? i.customName ?? "Item",
          origin: i.origin,
          included: i.included,
          checked: i.checked,
          suggestedQuantity: i.suggestedQuantity,
          unit: i.unit,
          lastUnitPrice: i.lastUnitPrice,
        })),
      }
    : null;

  return <ShoppingListView list={data} currentMonth={monthKeyOf(new Date())} />;
}
