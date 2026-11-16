const { prisma } = require('./lib/prisma');
(async () => {
  try {
    const variant = await prisma.productVariant.findFirst({
      select: {
        id: true,
        productId: true,
        colorName: true,
        colorHex: true,
        size: true,
        stock: true,
        images: true,
        position: true,
        createdAt: true,
      },
    });
    console.log('ProductVariant fields:', variant ? Object.keys(variant).join(', ') : 'no rows');
  } catch (e) {
    console.log('error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
