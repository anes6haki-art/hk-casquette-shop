# Hk casquette shop

French-language multi-product casquette storefront and order dashboard for customers across Algeria, built with Next.js App Router, Tailwind CSS, and Prisma with PostgreSQL.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env`. `admin123` is the local development password. Before production, set a unique `ADMIN_PASSWORD` of at least 12 characters and replace `ADMIN_SESSION_SECRET` with a random secret of at least 32 characters. For example, generate one with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Keep `.env` private and never commit it.

   If `ADMIN_PASSWORD` is unset in local development, the dashboard also accepts `admin123`. Production requires an explicitly configured password (at least 12 characters) and session secret.

3. Push the Prisma schema to the PostgreSQL database configured by `DATABASE_URL`:

   ```bash
   npx prisma db push
   ```

4. (Optional) Add ten sample caps and generated local sample images:

   ```bash
   npm run db:seed
   ```

   The seed command skips sample products that already exist by title and can be run again without duplicating them.

5. Start the app:

   ```bash
   npm run dev
   ```

The storefront is available at `http://localhost:3000`; product detail and order pages are at `/products/<product-id>`, and the protected dashboard is at `http://localhost:3000/admin`.

## Orders and administration

The home page lists every active casquette. Each product has a detail page with its image gallery, stock status, description, and cash-on-delivery checkout. Checkout submissions are validated and stored in PostgreSQL, including the product title and price snapshot. The dashboard lists orders newest first and lets an administrator update each order to Pending, Confirmed, Shipped, Delivered, or Cancelled. Delivery prices can be edited for home and Stop Desk delivery for each wilaya; checkout loads the selected wilaya's current rates and the server recalculates the final order total. The commune dropdown loads locally and contains all 1,541 communes across the store's 58 Wilayas; the server also validates that a selected commune belongs to the selected Wilaya. Admin sessions use an HTTP-only, signed cookie and expire after eight hours; dashboard reads and updates check the session on the server.

The `/admin/products` page lets administrators create, edit, activate, and delete casquettes. Images can be uploaded directly from the product form (JPEG, PNG, WebP, or AVIF; up to 5 MB per image and 8 images per product) and are stored under `public/uploads`; the form also accepts existing HTTP(S) image URLs. Every active product appears in the storefront catalog. Checkout uses its discounted price and decrements stock when an order is saved.

### DHD delivery

Confirmed orders can be submitted to the DHD endpoint from the dashboard. Set `DHD_API_KEY`, `DHD_API_SECRET`, and `DHD_API_URL` in the server environment. The adapter sends the key and secret as `X-API-Key` and `X-API-Secret` headers, posts the order reference, recipient, and cash-on-delivery parcel details as JSON, and expects `trackingNumber` (or `tracking_number`) in the response. The returned tracking number and delivery status are saved on the order. Match the endpoint, authentication headers, request fields, and response mapping to the API documentation supplied with your DHD account before enabling live shipments. Without credentials, the route responds with `Clé API DHD non configurée`.

The homepage hero uses a local photograph of a blue baseball cap from [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Baseball_cap.jpg); the image is public domain.

For Vercel, set `DATABASE_URL` in the project's Environment Variables to the PostgreSQL connection string, then ensure the Prisma schema has been pushed to that same database with `npx prisma db push`. Do not use `npm run db:deploy` for this PostgreSQL schema: the checked-in migration history was created for SQLite. Set the required admin and session secrets in Vercel as well; never commit `.env`. Uploaded images are written to `public/uploads`, which is not persistent storage on Vercel, so use durable object storage for production uploads. The database contains customer names, phone numbers, and delivery addresses, so protect the database and backups as sensitive personal data.

## Available commands

- `npm run dev` — start the development server
- `npm run lint` — lint the project
- `npm run build` — create a production build
- `npm run db:generate` — regenerate Prisma Client
- `npm run db:migrate -- --name <migration>` — create and apply a development migration
- `npm run db:deploy` — apply committed migrations in production
