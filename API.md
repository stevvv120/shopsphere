# ShopSphere API

Backend API built with NestJS, Prisma, and PostgreSQL.

The storefront order history includes **Kuartal ini** (the start of the current calendar quarter through today) and **Kuartal lalu** (the full previous calendar quarter) date presets. Its quick date filters also include a rolling **180 hari** range ending today.

The customer catalog supports category and favorite filters, minimum and maximum prices, in-stock-only and minimum-rating filters, and sorting by price, name, rating, or newest product. Products are shown eight per page; pagination follows the active filters and sorting, and changing a filter or search starts at the first page. **Hapus semua filter** resets the catalog search and filter controls together. Opening a product detail adds it to the browser's **Terakhir kamu lihat** list, which keeps up to four products across page reloads and can be cleared at any time. Product detail links use the `?product=<id>` query parameter so shared links reopen the selected product; the detail dialog can share the link with the device's native share sheet or copy it to the clipboard.

## Start the API

Use Node.js 22.18 or newer. Set `DATABASE_URL` in `.env`, then run:

```powershell
npm install
npm run prisma:generate
npx prisma migrate deploy
npm run start:dev
```

Set `JWT_SECRET` in `.env` to a random value of at least 32 bytes. The local `.env.example` lists the available settings. To create an admin, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, then run `npm run admin:seed`. The seed promotes that email to `ADMIN` and updates its password each time it runs.

The API listens at `http://127.0.0.1:3001/api/v1` by default. Set `HOST` or `PORT` in `.env` to change the bind address or port. The default CORS origins are `http://localhost:5173` and `http://127.0.0.1:5173`; set `CORS_ORIGIN` to a comma-separated list to change them. PostgreSQL must be running. For bank transfer, set `BANK_TRANSFER_BANK_NAME`, `BANK_TRANSFER_ACCOUNT_NAME`, and `BANK_TRANSFER_ACCOUNT_NUMBER` in `.env`; these details are returned publicly by `/api/v1/store-config`, so use a customer-facing account. Set all three values or leave them all blank. Restart the API after editing `.env`.

The ShopSphere storefront is served by the same NestJS app at `http://127.0.0.1:3001/`. Checkout requests send an `Idempotency-Key`; retrying the same key and payload returns the original order without reducing stock again, while reusing the key with different checkout data returns `409 Conflict`. API clients can provide the same optional header for this protection. The checkout saves an order and reduces stock in the same database transaction. After an order is placed, the customer's latest recipient name, phone number, and shipping address are saved to their account and prefilled at their next checkout; customers can edit these details before placing an order or update them from **Alamat tersimpan** in the **Pesanan** view. Customers can open **Pesanan** in the storefront header to review an order progress timeline, search orders by order number (with or without a leading `#`), product name, recipient, phone number, delivery address, order note, order status, payment method or status, courier, or tracking number, filter orders by order status, payment method, payment status, and order date range (the start date must not be later than the end date), use quick date ranges for all dates, today, yesterday, this calendar week (Monday through today), last calendar week (Monday through Sunday), this calendar month, the previous calendar month, this calendar year, the last seven days, the last 30 days, or the last 90 days (the matching preset is visibly and accessibly marked), sort by newest or oldest, and browse matching results five orders per page. Customer and admin order lists sort by creation time, using the order ID as a stable tie-breaker. Search, filters, and sorting reset the page to the first result; **Hapus filter** clears them together. **Unduh CSV** exports all matching orders (not only the current page), including recipient, phone, and delivery address, and follows the active search, filters, and sorting. Customers can select **Perbarui** to retrieve current order and shipment information without closing the view. The order card can copy a summary containing order number, date, status, total, recipient details, and available tracking information; tracking numbers and recipient, phone, and address details can also be copied separately. Unpaid bank-transfer orders provide a shortcut to copy complete payment instructions, including the order number, bank account, account name, and transfer amount. **Beli lagi** adds the order's products back to the cart up to their current available stock; unavailable items are skipped or capped and reported. While the order history is open, its data refreshes every 45 seconds and when the customer returns to the browser tab; automatic refresh pauses while the tab is hidden and stops when the view is closed. The view displays the time of the last successful refresh and retains the last loaded orders if a background update fails. The timeline displays known order and shipment dates without implying timestamps the system does not record. Customers can then open a printable invoice that can be printed or saved as PDF from the browser. Product cards show rating summaries and customer reviews; customers can review a product after an order containing it is marked delivered. Payments are recorded manually: customers may choose bank transfer or cash on delivery (COD), and an admin confirms payment after checking it. The app does not connect to a payment provider. Public bank-transfer instructions are read from `BANK_TRANSFER_BANK_NAME`, `BANK_TRANSFER_ACCOUNT_NAME`, and `BANK_TRANSFER_ACCOUNT_NUMBER`; configure all three to show the account in checkout and unpaid orders, or leave them all blank so customers are told to contact the admin. A flat shipping fee is read from `SHIPPING_FEE` in rupiah and included in each order; it defaults to `0` when unset. The admin dashboard is at `http://127.0.0.1:3001/admin.html`; sign in with an account whose role is `ADMIN` to manage products, stock, categories, order status, payment status, and shipping details. The dashboard can export filtered products, categories, orders, customers, or reviews as CSV; filter products by stock; filter orders by order status, payment status, and date range, with summary cards following active filters and the paid-sales chart following the selected date range; review or remove customer reviews; view confirmed-payment totals by day or month for the selected date range (seven days by default) and the top five products sold; export the full product ranking as CSV; browse admin tables ten rows per page; and print a packing slip for each order. Its customer summary lists accounts with at least one order, showing order count, paid total, and most recent order date. Admins can segment customers into repeat buyers, one-time buyers, and accounts with no order in the last 30 days, then open each customer's order history and jump to that customer's filtered order list. Courier and tracking information are entered manually; the app does not connect to courier tracking APIs. The storefront keeps its cart in browser storage.

Order-history requests have a 15-second timeout. If a background refresh times out or cannot connect, the last successfully loaded orders remain visible. Product cards show rating summaries and customer reviews; customers can review a product after an order containing it is marked delivered. Payments are recorded manually: customers may choose bank transfer or cash on delivery (COD), and an admin confirms payment after checking it. The app does not connect to a payment provider. Public bank-transfer instructions are read from `BANK_TRANSFER_BANK_NAME`, `BANK_TRANSFER_ACCOUNT_NAME`, and `BANK_TRANSFER_ACCOUNT_NUMBER`; configure all three to show the account in checkout and unpaid orders, or leave them all blank so customers are told to contact the admin. A flat shipping fee is read from `SHIPPING_FEE` in rupiah and included in each order; it defaults to `0` when unset. The admin dashboard is at `http://127.0.0.1:3001/admin.html`; sign in with an account whose role is `ADMIN` to manage products, stock, categories, order status, payment status, and shipping details. The dashboard can export filtered products, categories, orders, customers, or reviews as CSV; filter products by stock; filter orders by order status, payment status, and date range, with summary cards following active filters and the paid-sales chart following the selected date range; review or remove customer reviews; view confirmed-payment totals by day or month for the selected date range (seven days by default) and the top five products sold; export the full product ranking as CSV; browse admin tables ten rows per page; and print a packing slip for each order. Its customer summary lists accounts with at least one order, showing order count, paid total, and most recent order date. Admins can segment customers into repeat buyers, one-time buyers, and accounts with no order in the last 30 days, then open each customer's order history and jump to that customer's filtered order list. Courier and tracking information are entered manually; the app does not connect to courier tracking APIs. The storefront keeps its cart in browser storage.

Customers can save products as favorites with the heart button on each product card. Guest favorites stay in browser storage. When a customer signs in, the storefront merges them with that account's favorites stored in the database; later changes sync to the account and browser.

Customer order cards and printable invoices show the recipient name, phone number, and shipping address saved with each order, so customers can verify the delivery details independently of their current profile address. Invoices also include the recorded courier, tracking number, and shipped date when available. Optional customer notes are shown on the order card and invoice, and included in the matching-order CSV export.

## Routes

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Check the API and database connection |
| `GET` | `/api/v1/store-config` | Read public store settings, including the flat shipping fee and optional bank-transfer instructions |
| `POST` | `/api/v1/auth/register` | Register a customer account |
| `POST` | `/api/v1/auth/login` | Log in and receive a JWT |
| `PATCH` | `/api/v1/auth/shipping-address` | Update the signed-in customer's saved shipping address |
| `GET` | `/api/v1/products` | List products, including their category |
| `GET` | `/api/v1/products/:id` | Get one product |
| `GET` | `/api/v1/products/:id/reviews` | List reviews and rating summary for a product |
| `POST` | `/api/v1/products/:id/reviews` | Create or update the signed-in customer's product review |
| `GET` | `/api/v1/admin/reviews` | List all reviews for an admin (ADMIN) |
| `DELETE` | `/api/v1/admin/reviews/:id` | Remove a customer review (ADMIN) |
| `POST` | `/api/v1/products` | Create a product |
| `PATCH` | `/api/v1/products/:id` | Update product fields |
| `DELETE` | `/api/v1/products/:id` | Delete a product |
| `GET` | `/api/v1/categories` | List categories and product counts |
| `GET` | `/api/v1/categories/:id` | Get one category |
| `POST` | `/api/v1/categories` | Create a category |
| `PATCH` | `/api/v1/categories/:id` | Update a category |
| `DELETE` | `/api/v1/categories/:id` | Delete a category |
| `POST` | `/api/v1/orders` | Create an order (customer token required) |
| `GET` | `/api/v1/orders/mine` | List the signed-in customer's orders |
| `GET` | `/api/v1/orders/audit-log` | List the latest 100 order, payment, shipping, and cancellation changes (ADMIN) |
| `POST` | `/api/v1/orders/:id/cancel` | Cancel the signed-in customer's pending, unpaid order and restore stock |
| `GET` | `/api/v1/orders` | List all orders (admin token required) |
| `PATCH` | `/api/v1/orders/:id/status` | Advance or cancel an order (admin token required) |
| `PATCH` | `/api/v1/orders/:id/payment-status` | Record a manual payment status change (admin token required) |
| `PATCH` | `/api/v1/orders/:id/shipping` | Add courier and tracking number and mark a processing order as shipped (admin token required) |
| `GET` | `/api/v1/favorites` | List the signed-in customer's favorite product IDs |
| `POST` | `/api/v1/favorites/sync` | Add browser favorites to the signed-in customer's list |
| `POST` | `/api/v1/favorites/:productId` | Save a product to the signed-in customer's favorites |
| `DELETE` | `/api/v1/favorites/:productId` | Remove a product from the signed-in customer's favorites |

Product request bodies use JSON. `name` and `price` are required when creating a product. `price` must be non-negative and have at most two decimal places. `description` is optional, `stock` defaults to zero, and `categoryId` can be an existing category id or `null`. `imageUrl` is optional and must be an HTTP or HTTPS image URL accessible to the storefront browser. The server stores the URL; it does not upload or host image files.

Admins can add inventory with `POST /api/v1/products/:id/restock` and a JSON body such as `{ "quantity": 12 }`. The positive integer quantity is added atomically to the existing stock, up to 1,000,000 units per request. The admin dashboard provides this action from each product row. Stock changes from restocking, manual product edits, orders, and order cancellations are recorded in the stock ledger; admins can read up to 100 recent entries with `GET /api/v1/products/:id/stock-movements` and export the displayed product history as CSV.

Category creation requires a `name`. A URL-friendly `slug` is generated from the name unless supplied explicitly. Category names and slugs must be unique. Deleting a category leaves its products in place and clears their `categoryId`.

Unknown request fields are rejected.

Customers can review a product only after one of their orders containing it is marked `DELIVERED`. Send `rating` as an integer from 1 to 5 and an optional `comment` of up to 1,000 characters. A customer has one review per product; posting again updates that review. Product listings include `averageRating` and `reviewCount`.

Registration always creates a `CUSTOMER`; clients cannot assign themselves the `ADMIN` role. Product and category `POST`, `PATCH`, and `DELETE` routes require an admin access token. Send it as `Authorization: Bearer <accessToken>`. Catalog `GET` routes remain public.

Favorite routes require a customer access token. `GET /favorites` returns `{ "productIds": [1, 2] }`. `POST /favorites/sync` accepts `{ "productIds": [1, 2] }` and adds those IDs without removing favorites already saved to the account. The storefront merges browser favorites with account favorites when a customer signs in; later heart-button changes are saved to both the account and that browser.

Creating an order requires a customer access token. The body contains `items` with product IDs and integer quantities, `paymentMethod` (`BANK_TRANSFER` or `CASH_ON_DELIVERY`), plus `shippingName`, `shippingPhone`, and `shippingAddress`; `notes` is optional. The server reads current product prices, stock, and `SHIPPING_FEE` itself, rejects duplicate product IDs or insufficient stock, and records item name and price snapshots. Product stock reductions and order creation happen together, so a failed order does not reduce stock. Each order stores `subtotal`, `shippingFee`, and `total` as separate snapshots, so later fee changes do not alter previous orders. The storefront displays the fee before checkout. Set `SHIPPING_FEE` to a non-negative whole rupiah amount; it defaults to `0` when unset and applies to all addresses. Payment is tracked as `PENDING`, `PAID`, `FAILED`, or `REFUNDED` and must be updated manually by an admin after checking the transfer or COD collection. A bank-transfer order cannot move to `PROCESSING` until marked paid. Customers can cancel their own `PENDING` order using `POST /orders/:id/cancel` only while payment is not confirmed as paid; cancellation and stock restoration happen in one transaction. A paid order must be marked refunded before an admin can cancel it; refunds are only tracked for unshipped orders. This is not an online payment gateway. Customers can read only their own orders at `/orders/mine`. Admin order statuses advance from `PENDING` to `PROCESSING` or `CANCELLED`, then from `PROCESSING` to `SHIPPED` using the shipping endpoint with a `carrier` and `trackingNumber`, and from `SHIPPED` to `DELIVERED` using the status endpoint. A bank-transfer order must be marked paid before shipping. Cancelling a pending or processing order restores its stock.

## PowerShell examples

Check the service:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/api/v1/health
Invoke-RestMethod http://127.0.0.1:3001/api/v1/store-config
```

Register a customer:

```powershell
$customer = Invoke-RestMethod -Uri http://127.0.0.1:3001/api/v1/auth/register -Method Post -ContentType "application/json" -Body '{"name":"Jamie Doe","email":"jamie@example.com","password":"example-password-123"}'
```

Log in as the seeded admin:

```powershell
$login = Invoke-RestMethod -Uri http://127.0.0.1:3001/api/v1/auth/login -Method Post -ContentType "application/json" -Body '{"email":"admin@example.com","password":"replace-this-password"}'
$headers = @{ Authorization = "Bearer $($login.accessToken)" }
```

Create a product:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:3001/api/v1/products -Method Post -Headers $headers -ContentType "application/json" -Body '{"name":"Sample product","price":19.99,"imageUrl":"https://example.com/sample.jpg"}'
```

List products:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/api/v1/products
```

List reviews for product 1 or submit a review as a signed-in customer:

```powershell
$customerLogin = Invoke-RestMethod -Uri http://127.0.0.1:3001/api/v1/auth/login -Method Post -ContentType "application/json" -Body '{"email":"jamie@example.com","password":"example-password-123"}'
$customerHeaders = @{ Authorization = "Bearer $($customerLogin.accessToken)" }
Invoke-RestMethod http://127.0.0.1:3001/api/v1/products/1/reviews
Invoke-RestMethod -Uri http://127.0.0.1:3001/api/v1/products/1/reviews -Method Post -Headers $customerHeaders -ContentType "application/json" -Body '{"rating":5,"comment":"Produknya sesuai deskripsi."}'
```

Create a category:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:3001/api/v1/categories -Method Post -Headers $headers -ContentType "application/json" -Body '{"name":"Peralatan rumah"}'
```

Create a product assigned to category 1:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:3001/api/v1/products -Method Post -Headers $headers -ContentType "application/json" -Body '{"name":"Produk baru","price":19.99,"stock":12,"description":"Deskripsi produk","categoryId":1}'
```

Create a customer account and order:

```powershell
$customer = Invoke-RestMethod -Uri http://127.0.0.1:3001/api/v1/auth/register -Method Post -ContentType "application/json" -Body '{"name":"Jamie Doe","email":"jamie@example.com","password":"example-password-123"}'
$customerHeaders = @{ Authorization = "Bearer $($customer.accessToken)" }
$orderBody = '{"items":[{"productId":1,"quantity":1}],"paymentMethod":"CASH_ON_DELIVERY","shippingName":"Jamie Doe","shippingPhone":"081234567890","shippingAddress":"Jalan Contoh 10, Jakarta"}'
Invoke-RestMethod -Uri http://127.0.0.1:3001/api/v1/orders -Method Post -Headers $customerHeaders -ContentType "application/json" -Body $orderBody
# Batalkan pesanan yang masih PENDING dan belum dibayar.
Invoke-RestMethod -Uri http://127.0.0.1:3001/api/v1/orders/1/cancel -Method Post -Headers $customerHeaders
```

List orders as admin or update an order status:

```powershell
Invoke-RestMethod http://127.0.0.1:3001/api/v1/orders -Headers $headers
Invoke-RestMethod -Uri http://127.0.0.1:3001/api/v1/orders/1/payment-status -Method Patch -Headers $headers -ContentType "application/json" -Body '{"status":"PAID"}'
Invoke-RestMethod -Uri http://127.0.0.1:3001/api/v1/orders/1/status -Method Patch -Headers $headers -ContentType "application/json" -Body '{"status":"PROCESSING"}'
Invoke-RestMethod -Uri http://127.0.0.1:3001/api/v1/orders/1/shipping -Method Patch -Headers $headers -ContentType "application/json" -Body '{"carrier":"JNE","trackingNumber":"JP1234567890"}'
Invoke-RestMethod -Uri http://127.0.0.1:3001/api/v1/orders/1/status -Method Patch -Headers $headers -ContentType "application/json" -Body '{"status":"DELIVERED"}'
```

Update a product:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:3001/api/v1/products/1 -Method Patch -Headers $headers -ContentType "application/json" -Body '{"price":24.50}'
```

Delete a product:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:3001/api/v1/products/1 -Method Delete -Headers $headers
```
