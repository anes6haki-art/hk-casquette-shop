const { prisma } = require('./lib/prisma');
(async () => {
  try {
    const res = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name='ProductVariant'`;
    console.log('columns:', res.map(r => r.column_name).join(', '));
  } catch (e) {
    console.log('error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
