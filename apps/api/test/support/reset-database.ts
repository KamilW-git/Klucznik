import type { PrismaService } from '../../src/infrastructure/prisma/prisma.service';

/**
 * Czyści wszystkie tabele aplikacji (bez `_prisma_migrations`) przed testem
 * (docs/architecture/testing-strategy.md#testy-integracyjne-zasady).
 */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) {
    return;
  }
  const list = tables.map(({ tablename }) => `"public"."${tablename}"`).join(', ');
  // Nazwy tabel pochodzą z katalogu PostgreSQL, nie od użytkownika.
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
