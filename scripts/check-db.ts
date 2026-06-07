import "dotenv/config";

import { prisma } from "../src/lib/db";

async function main() {
  const count = await prisma.product.count();
  console.log("OK — conexão Prisma funcionando. Produtos:", count);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
