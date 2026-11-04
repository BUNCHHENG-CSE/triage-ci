import { prisma } from '../src/lib/db';
import { seedInitialDemoData } from '../src/lib/seed';

async function main() {
  console.log('[seed] Seeding database with initial failure clusters and logs...');
  await seedInitialDemoData();
  console.log('[seed] Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('[seed] Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
