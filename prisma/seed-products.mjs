import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const width = 640;
const height = 520;
const palettes = [
  { name: "Noir", background: [224, 222, 211], cap: [38, 42, 40], shade: [19, 23, 22], accent: [208, 184, 119] },
  { name: "Beige", background: [236, 228, 210], cap: [191, 163, 119], shade: [139, 113, 78], accent: [76, 83, 64] },
  { name: "Olive", background: [222, 226, 208], cap: [100, 111, 69], shade: [65, 76, 46], accent: [225, 207, 151] },
  { name: "Bleu Marine", background: [215, 222, 229], cap: [39, 61, 91], shade: [23, 40, 63], accent: [221, 190, 124] },
  { name: "Bordeaux", background: [231, 218, 210], cap: [118, 48, 56], shade: [79, 31, 41], accent: [228, 194, 137] },
  { name: "Gris", background: [226, 226, 220], cap: [111, 116, 115], shade: [75, 80, 80], accent: [231, 224, 203] },
  { name: "Sable", background: [237, 228, 207], cap: [211, 184, 139], shade: [163, 137, 98], accent: [54, 69, 57] },
  { name: "Vert Forêt", background: [218, 226, 214], cap: [47, 81, 62], shade: [27, 55, 42], accent: [222, 192, 129] },
  { name: "Terracotta", background: [235, 220, 204], cap: [183, 100, 67], shade: [137, 66, 48], accent: [244, 216, 166] },
  { name: "Bleu Ciel", background: [217, 230, 232], cap: [107, 156, 174], shade: [67, 116, 138], accent: [248, 228, 178] },
];

const samples = [
  ["Casquette Classique Noire", "Une casquette noire intemporelle, facile à associer au quotidien. Visière courbée, finitions soignées et style décontracté.", 4500, 3500],
  ["Casquette Urban Beige", "Une teinte beige douce et polyvalente pour compléter vos tenues de tous les jours. Coupe confortable et allure urbaine.", 5200, 4200],
  ["Casquette Olive Street", "Un coloris olive inspiré du plein air, avec une silhouette streetwear qui se porte en ville comme en escapade.", 4900, 3900],
  ["Casquette Bleu Marine", "Un bleu marine élégant et facile à porter. Une casquette casual pensée pour accompagner vos sorties toute l’année.", 5500, 4500],
  ["Casquette Bordeaux Classic", "Une touche bordeaux pour apporter de la couleur à votre look. Modèle classique avec visière arrondie.", 4800, 3800],
  ["Casquette Gris Graphite", "Un gris graphite sobre pour un style moderne et minimal. S’accorde facilement avec vos essentiels.", 4600, 3600],
  ["Casquette Sable Weekend", "La couleur sable et la coupe décontractée en font un indispensable pour vos week-ends et promenades.", 5100, 4100],
  ["Casquette Vert Forêt", "Un vert profond au caractère affirmé. Modèle polyvalent pour les amateurs de tons naturels.", 5300, 4300],
  ["Casquette Terracotta", "Une nuance terracotta chaleureuse pour donner du relief à votre tenue, sans compromis sur le confort.", 5000, 4000],
  ["Casquette Bleu Ciel", "Une couleur bleu ciel lumineuse et un design décontracté pour compléter les journées ensoleillées.", 4700, 3700],
];

const color = (rgb, alpha = 255) => [rgb[0], rgb[1], rgb[2], alpha];

function drawImage(palette) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (x - width * 0.5) / (width * 0.8);
      const dy = (y - height * 0.42) / (height * 0.85);
      const glow = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
      const offset = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        pixels[offset + channel] = Math.min(255, Math.round(palette.background[channel] + glow * 15 - y / height * 5));
      }
      pixels[offset + 3] = 255;
    }
  }

  function setPixel(x, y, rgba) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const offset = (y * width + x) * 4;
    pixels[offset] = rgba[0];
    pixels[offset + 1] = rgba[1];
    pixels[offset + 2] = rgba[2];
    pixels[offset + 3] = rgba[3] ?? 255;
  }

  function ellipse(cx, cy, rx, ry, rgba) {
    const startX = Math.max(0, Math.floor(cx - rx));
    const endX = Math.min(width - 1, Math.ceil(cx + rx));
    const startY = Math.max(0, Math.floor(cy - ry));
    const endY = Math.min(height - 1, Math.ceil(cy + ry));
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const nx = (x - cx) / rx;
        const ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1) setPixel(x, y, rgba);
      }
    }
  }

  function polygon(points, rgba) {
    const minX = Math.max(0, Math.floor(Math.min(...points.map(([x]) => x))));
    const maxX = Math.min(width - 1, Math.ceil(Math.max(...points.map(([x]) => x))));
    const minY = Math.max(0, Math.floor(Math.min(...points.map(([, y]) => y))));
    const maxY = Math.min(height - 1, Math.ceil(Math.max(...points.map(([, y]) => y))));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const [xi, yi] = points[i];
          const [xj, yj] = points[j];
          if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) setPixel(x, y, rgba);
      }
    }
  }

  function line(x1, y1, x2, y2, rgba, thickness = 2) {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let step = 0; step <= steps; step++) {
      const progress = steps === 0 ? 0 : step / steps;
      ellipse(x1 + (x2 - x1) * progress, y1 + (y2 - y1) * progress, thickness, thickness, rgba);
    }
  }

  const outline = color(palette.shade);
  ellipse(325, 390, 213, 25, [39, 42, 34, 45]);

  const crown = [[166, 305], [179, 204], [207, 147], [253, 112], [320, 94], [387, 112], [433, 147], [461, 204], [474, 305]];
  polygon(crown, color(palette.cap));
  polygon([[166, 305], [179, 204], [207, 147], [253, 112], [320, 94], [319, 305]], color(palette.shade, 85));
  polygon([[320, 94], [387, 112], [433, 147], [461, 204], [474, 305], [320, 305]], color(palette.cap, 170));
  line(166, 305, 179, 204, outline, 3);
  line(179, 204, 207, 147, outline, 3);
  line(207, 147, 253, 112, outline, 3);
  line(253, 112, 320, 94, outline, 3);
  line(320, 94, 387, 112, outline, 3);
  line(387, 112, 433, 147, outline, 3);
  line(433, 147, 461, 204, outline, 3);
  line(461, 204, 474, 305, outline, 3);

  polygon([[166, 281], [475, 281], [568, 323], [584, 343], [553, 361], [475, 365], [393, 353], [302, 332], [222, 310], [169, 298]], color(palette.cap));
  polygon([[318, 288], [475, 281], [568, 323], [584, 343], [553, 361], [475, 365], [393, 353]], color(palette.shade, 75));
  line(169, 298, 222, 310, outline, 3);
  line(222, 310, 302, 332, outline, 3);
  line(302, 332, 393, 353, outline, 3);
  line(393, 353, 475, 365, outline, 3);
  line(475, 365, 553, 361, outline, 3);
  line(553, 361, 584, 343, outline, 3);
  line(194, 301, 302, 326, color(palette.accent), 1.6);
  line(302, 326, 398, 347, color(palette.accent), 1.6);
  line(398, 347, 485, 358, color(palette.accent), 1.6);

  line(320, 110, 320, 192, color(palette.accent, 170), 1.5);
  line(222, 152, 258, 206, color(palette.accent, 120), 1.5);
  line(418, 152, 382, 206, color(palette.accent, 120), 1.5);
  ellipse(238, 230, 6, 4, outline);
  ellipse(402, 230, 6, 4, outline);
  ellipse(320, 237, 39, 33, color(palette.accent));
  ellipse(320, 237, 32, 27, color(palette.cap));
  line(302, 249, 320, 222, color(palette.accent), 2.5);
  line(320, 222, 338, 249, color(palette.accent), 2.5);
  line(307, 241, 333, 241, color(palette.accent), 2.5);

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rawStart = y * (width * 4 + 1);
    raw[rawStart] = 0;
    pixels.copy(raw, rawStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const crcTable = drawImage.crcTable ??= Array.from({ length: 256 }, (_, n) => {
    let value = n;
    for (let bit = 0; bit < 8; bit++) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    return value >>> 0;
  });
  function chunk(type, data) {
    const typeBuffer = Buffer.from(type);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const checksumInput = Buffer.concat([typeBuffer, data]);
    let checksum = 0xffffffff;
    for (const byte of checksumInput) checksum = crcTable[(checksum ^ byte) & 0xff] ^ (checksum >>> 8);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE((checksum ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, checksumInput, crc]);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 8 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function main() {
  const uploadDirectory = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDirectory, { recursive: true });

  let created = 0;
  let skipped = 0;
  for (let index = 0; index < samples.length; index++) {
    const [title, description, originalPrice, discountedPrice] = samples[index];
    const imageName = `sample-casquette-${String(index + 1).padStart(2, "0")}.png`;
    await writeFile(path.join(uploadDirectory, imageName), drawImage(palettes[index]), { flag: "w" });

    const existing = await prisma.product.findFirst({
      where: { title },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.product.create({
      data: {
        title,
        description,
        originalPrice,
        discountedPrice,
        stockQuantity: 20,
        imageUrls: JSON.stringify([`/uploads/${imageName}`]),
        isActive: true,
      },
    });
    created++;
  }

  console.log(`Created ${created} sample products; skipped ${skipped} existing matching products.`);
}

main()
  .catch((error) => {
    console.error("Unable to seed sample cap products:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
