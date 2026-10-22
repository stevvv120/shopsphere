import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const PRICE = 25000;
const SHIPPING_FEE = 15000; // sama dengan test/setup-env.ts
const ADMIN_EMAIL = 'admin@test.local';
const ADMIN_PASSWORD = 'admin-password-123';

type Item = { productId: number; quantity: number };

describe('Order, stok, dan pembayaran (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;

  const api = () => request(app.getHttpServer());
  const bearer = (token: string) => `Bearer ${token}`;

  async function registerCustomer(email: string): Promise<string> {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ name: 'Pelanggan Tes', email, password: 'customer-password-123' })
      .expect(201);
    return res.body.accessToken;
  }

  async function createProduct(stock: number, name = 'Kaos Polos'): Promise<number> {
    const res = await api()
      .post('/api/v1/products')
      .set('Authorization', bearer(adminToken))
      .send({ name, price: PRICE, stock })
      .expect(201);
    return res.body.id;
  }

  const placeOrder = (
    token: string,
    items: Item[],
    overrides: Record<string, unknown> = {},
    idempotencyKey?: string,
  ) => {
    const req = api()
      .post('/api/v1/orders')
      .set('Authorization', bearer(token))
      .send({
        paymentMethod: 'CASH_ON_DELIVERY',
        shippingName: 'Budi Santoso',
        shippingPhone: '081234567890',
        shippingAddress: 'Jalan Contoh 10, Jakarta',
        items,
        ...overrides,
      });
    if (idempotencyKey) req.set('Idempotency-Key', idempotencyKey);
    return req;
  };

  // POST tanpa @HttpCode di NestJS menghasilkan 201, termasuk endpoint cancel.
  const cancelOrder = (token: string, orderId: number) =>
    api().post(`/api/v1/orders/${orderId}/cancel`).set('Authorization', bearer(token));

  const adminPatch = (path: string, body: Record<string, unknown>) =>
    api().patch(`/api/v1${path}`).set('Authorization', bearer(adminToken)).send(body);

  const stockOf = async (id: number) =>
    (await prisma.product.findUniqueOrThrow({ where: { id } })).stock;

  const ledger = (productId: number) =>
    prisma.stockMovement.findMany({ where: { productId }, orderBy: { id: 'asc' } });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    // Samakan dengan src/main.ts.
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "AuditLog", "StockMovement", "Favorite", "Review", "OrderItem", "Order", "Product", "Category", "User" RESTART IDENTITY CASCADE`,
    );
    await prisma.user.create({
      data: {
        name: 'Admin Tes',
        email: ADMIN_EMAIL,
        passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 4),
        role: Role.ADMIN,
      },
    });
    const login = await api()
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    adminToken = login.body.accessToken;
  });

  describe('membuat order', () => {
    it('mengurangi stok, menyimpan snapshot harga, menambah ongkir, dan mencatat ledger', async () => {
      const productId = await createProduct(10);
      const customer = await registerCustomer('a@test.local');

      const res = await placeOrder(customer, [{ productId, quantity: 2 }]).expect(201);

      expect(res.body.status).toBe('PENDING');
      expect(res.body.paymentStatus).toBe('PENDING');
      expect(Number(res.body.subtotal)).toBe(2 * PRICE);
      expect(Number(res.body.shippingFee)).toBe(SHIPPING_FEE);
      expect(Number(res.body.total)).toBe(2 * PRICE + SHIPPING_FEE);
      expect(res.body.items[0]).toMatchObject({
        productId,
        productName: 'Kaos Polos',
        quantity: 2,
      });

      expect(await stockOf(productId)).toBe(8);
      const placed = (await ledger(productId)).find((m) => m.reason === 'ORDER_PLACED');
      expect(placed).toMatchObject({ delta: -2, stockAfter: 8, orderId: res.body.id });
    });

    it('memproses pengiriman checkout paralel dengan kunci idempotensi hanya satu kali', async () => {
      const productId = await createProduct(10);
      const customer = await registerCustomer('idempotency@test.local');
      const key = 'checkout-request-123';

      const [first, retry] = await Promise.all([
        placeOrder(customer, [{ productId, quantity: 2 }], {}, key).expect(201),
        placeOrder(customer, [{ productId, quantity: 2 }], {}, key).expect(201),
      ]);

      expect(first.body.id).toBe(retry.body.id);
      expect(await prisma.order.count()).toBe(1);
      expect(await stockOf(productId)).toBe(8);
      expect((await ledger(productId)).filter((movement) => movement.reason === 'ORDER_PLACED')).toHaveLength(1);
    });

    it('menolak penggunaan ulang kunci idempotensi dengan isi checkout berbeda', async () => {
      const productId = await createProduct(10);
      const customer = await registerCustomer('idempotency-conflict@test.local');
      const key = 'checkout-request-456';

      await placeOrder(customer, [{ productId, quantity: 1 }], {}, key).expect(201);
      await placeOrder(customer, [{ productId, quantity: 2 }], {}, key).expect(409);

      expect(await prisma.order.count()).toBe(1);
      expect(await stockOf(productId)).toBe(9);
    });

    it('menyimpan alamat checkout terakhir untuk diisi otomatis pada sesi berikutnya', async () => {
      const productId = await createProduct(3);
      const customer = await registerCustomer('saved-address@test.local');

      await placeOrder(customer, [{ productId, quantity: 1 }], {
        shippingName: 'Siti Pelanggan',
        shippingPhone: '081298765432',
        shippingAddress: 'Jalan Melati 20, Bandung',
      }).expect(201);

      const login = await api()
        .post('/api/v1/auth/login')
        .send({ email: 'saved-address@test.local', password: 'customer-password-123' })
        .expect(200);

      expect(login.body.user).toMatchObject({
        shippingName: 'Siti Pelanggan',
        shippingPhone: '081298765432',
        shippingAddress: 'Jalan Melati 20, Bandung',
      });

      await placeOrder(login.body.accessToken, [{ productId, quantity: 1 }], {
        shippingName: 'Siti Pelanggan',
        shippingPhone: '081211111111',
        shippingAddress: 'Jalan Anggrek 5, Bandung',
      }).expect(201);

      const nextLogin = await api()
        .post('/api/v1/auth/login')
        .send({ email: 'saved-address@test.local', password: 'customer-password-123' })
        .expect(200);
      expect(nextLogin.body.user).toMatchObject({
        shippingPhone: '081211111111',
        shippingAddress: 'Jalan Anggrek 5, Bandung',
      });
    });

    it('tidak mengubah harga di order lama setelah harga produk berubah', async () => {
      const productId = await createProduct(5);
      const customer = await registerCustomer('snapshot@test.local');
      await placeOrder(customer, [{ productId, quantity: 1 }]).expect(201);

      await adminPatch(`/products/${productId}`, { price: 99000 }).expect(200);

      const mine = await api()
        .get('/api/v1/orders/mine')
        .set('Authorization', bearer(customer))
        .expect(200);
      expect(Number(mine.body[0].items[0].unitPrice)).toBe(PRICE);
      expect(Number(mine.body[0].subtotal)).toBe(PRICE);
    });

    it('membatalkan seluruh order (rollback) jika satu item stoknya kurang', async () => {
      const productA = await createProduct(5, 'Produk A');
      const productB = await createProduct(1, 'Produk B');
      const customer = await registerCustomer('rollback@test.local');

      await placeOrder(customer, [
        { productId: productA, quantity: 2 },
        { productId: productB, quantity: 2 },
      ]).expect(400);

      expect(await stockOf(productA)).toBe(5);
      expect(await stockOf(productB)).toBe(1);
      expect(await prisma.order.count()).toBe(0);
      expect((await ledger(productA)).some((m) => m.reason === 'ORDER_PLACED')).toBe(false);
    });

    it('menolak product ID ganda, produk yang tidak ada, dan akses tanpa hak', async () => {
      const productId = await createProduct(5);
      const customer = await registerCustomer('validasi@test.local');

      await placeOrder(customer, [
        { productId, quantity: 1 },
        { productId, quantity: 1 },
      ]).expect(400);
      await placeOrder(customer, [{ productId: 99999, quantity: 1 }]).expect(404);

      await api().post('/api/v1/orders').send({}).expect(401);
      await placeOrder(adminToken, [{ productId, quantity: 1 }]).expect(403);
      expect(await stockOf(productId)).toBe(5);
    });

    it('menolak data checkout yang tidak valid tanpa membuat order atau mengurangi stok', async () => {
      const productId = await createProduct(5);
      const customer = await registerCustomer('checkout-validation@test.local');

      await placeOrder(customer, [{ productId, quantity: 0 }]).expect(400);
      await placeOrder(customer, [{ productId, quantity: 1 }], {
        shippingPhone: 'nomor tidak valid',
      }).expect(400);
      await placeOrder(customer, [{ productId, quantity: 1 }], {
        shippingAddress: '',
      }).expect(400);
      await placeOrder(customer, [{ productId, quantity: 1 }], {
        couponCode: 'DISKON',
      }).expect(400);

      expect(await prisma.order.count()).toBe(0);
      expect(await stockOf(productId)).toBe(5);
    });

    it('hanya menjual unit terakhir satu kali saat dua pelanggan membeli bersamaan', async () => {
      const productId = await createProduct(1);
      const first = await registerCustomer('race1@test.local');
      const second = await registerCustomer('race2@test.local');

      const results = await Promise.all([
        placeOrder(first, [{ productId, quantity: 1 }]),
        placeOrder(second, [{ productId, quantity: 1 }]),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([201, 400]);
      expect(await stockOf(productId)).toBe(0);
      expect(await prisma.order.count()).toBe(1);
    });
  });

  describe('alamat pengiriman tersimpan', () => {
    it('hanya pelanggan yang bisa menyimpan alamat valid dan perubahan muncul saat login berikutnya', async () => {
      const customer = await registerCustomer('address-profile@test.local');
      const savedAddress = {
        shippingName: 'Dewi Pelanggan',
        shippingPhone: '+62 812-3456-7890',
        shippingAddress: 'Jalan Kenanga 8, Surabaya',
      };

      const saved = await api()
        .patch('/api/v1/auth/shipping-address')
        .set('Authorization', bearer(customer))
        .send(savedAddress)
        .expect(200);
      expect(saved.body).toMatchObject(savedAddress);

      const login = await api()
        .post('/api/v1/auth/login')
        .send({ email: 'address-profile@test.local', password: 'customer-password-123' })
        .expect(200);
      expect(login.body.user).toMatchObject(savedAddress);
      expect(login.body.user.passwordHash).toBeUndefined();

      await api()
        .patch('/api/v1/auth/shipping-address')
        .send(savedAddress)
        .expect(401);
      await api()
        .patch('/api/v1/auth/shipping-address')
        .set('Authorization', bearer(adminToken))
        .send(savedAddress)
        .expect(403);
      await api()
        .patch('/api/v1/auth/shipping-address')
        .set('Authorization', bearer(customer))
        .send({ ...savedAddress, shippingPhone: 'telepon salah' })
        .expect(400);

      const unchanged = await api()
        .post('/api/v1/auth/login')
        .send({ email: 'address-profile@test.local', password: 'customer-password-123' })
        .expect(200);
      expect(unchanged.body.user).toMatchObject(savedAddress);
    });
  });

  describe('pembatalan oleh pelanggan', () => {
    it('mengembalikan stok dan mencatat ORDER_CANCELLED, dan tidak bisa dibatalkan dua kali', async () => {
      const productId = await createProduct(10);
      const customer = await registerCustomer('cancel@test.local');
      const order = (await placeOrder(customer, [{ productId, quantity: 3 }]).expect(201)).body;
      expect(await stockOf(productId)).toBe(7);

      const cancelled = await cancelOrder(customer, order.id).expect(201);
      expect(cancelled.body.status).toBe('CANCELLED');
      expect(await stockOf(productId)).toBe(10);
      const restored = (await ledger(productId)).find((m) => m.reason === 'ORDER_CANCELLED');
      expect(restored).toMatchObject({ delta: 3, stockAfter: 10, orderId: order.id });

      await cancelOrder(customer, order.id).expect(400);
      expect(await stockOf(productId)).toBe(10); // stok tidak dikembalikan dua kali
    });

    it('tidak bisa membatalkan atau melihat order milik pelanggan lain', async () => {
      const productId = await createProduct(5);
      const owner = await registerCustomer('owner@test.local');
      const other = await registerCustomer('other@test.local');
      const order = (await placeOrder(owner, [{ productId, quantity: 1 }]).expect(201)).body;

      await cancelOrder(other, order.id).expect(404);
      const mine = await api()
        .get('/api/v1/orders/mine')
        .set('Authorization', bearer(other))
        .expect(200);
      expect(mine.body).toEqual([]);
      expect(await stockOf(productId)).toBe(4);
    });

    it('tidak bisa membatalkan order yang sudah dibayar', async () => {
      const productId = await createProduct(5);
      const customer = await registerCustomer('paid@test.local');
      const order = (await placeOrder(customer, [{ productId, quantity: 1 }]).expect(201)).body;
      await adminPatch(`/orders/${order.id}/payment-status`, { status: 'PAID' }).expect(200);

      await cancelOrder(customer, order.id).expect(400);
      expect(await stockOf(productId)).toBe(4);
    });
  });

  describe('riwayat pesanan pelanggan', () => {
    it('mengurutkan pesanan terbaru lebih dulu secara konsisten jika waktu pembuatan sama', async () => {
      const productId = await createProduct(5, 'Produk Urutan');
      const customer = await registerCustomer('history-ordering@test.local');
      const firstOrder = (
        await placeOrder(customer, [{ productId, quantity: 1 }]).expect(201)
      ).body;
      const secondOrder = (
        await placeOrder(customer, [{ productId, quantity: 1 }]).expect(201)
      ).body;

      await prisma.order.updateMany({
        where: { id: { in: [firstOrder.id, secondOrder.id] } },
        data: { createdAt: new Date('2026-10-20T12:00:00.000Z') },
      });

      const mine = await api()
        .get('/api/v1/orders/mine')
        .set('Authorization', bearer(customer))
        .expect(200);

      expect(mine.body.map((order: { id: number }) => order.id)).toEqual([
        secondOrder.id,
        firstOrder.id,
      ]);
    });

    it('mengembalikan detail pesanan milik pelanggan saja dan membatasi akses berdasarkan role', async () => {
      const productId = await createProduct(5, 'Produk Riwayat');
      const owner = await registerCustomer('history-owner@test.local');
      const other = await registerCustomer('history-other@test.local');
      const order = (
        await placeOrder(owner, [{ productId, quantity: 2 }], {
          paymentMethod: 'BANK_TRANSFER',
          notes: 'Titip di resepsionis',
        }).expect(201)
      ).body;

      await adminPatch(`/orders/${order.id}/payment-status`, { status: 'PAID' }).expect(200);
      await adminPatch(`/orders/${order.id}/status`, { status: 'PROCESSING' }).expect(200);
      await adminPatch(`/orders/${order.id}/shipping`, {
        carrier: 'JNE',
        trackingNumber: 'JP0987654321',
      }).expect(200);

      const mine = await api()
        .get('/api/v1/orders/mine')
        .set('Authorization', bearer(owner))
        .expect(200);

      expect(mine.body).toHaveLength(1);
      expect(mine.body[0]).toMatchObject({
        id: order.id,
        status: 'SHIPPED',
        paymentMethod: 'BANK_TRANSFER',
        paymentStatus: 'PAID',
        shippingCarrier: 'JNE',
        trackingNumber: 'JP0987654321',
        shippingName: 'Budi Santoso',
        shippingPhone: '081234567890',
        shippingAddress: 'Jalan Contoh 10, Jakarta',
        subtotal: String(PRICE * 2),
        shippingFee: String(SHIPPING_FEE),
        total: String(PRICE * 2 + SHIPPING_FEE),
        notes: 'Titip di resepsionis',
      });
      expect(mine.body[0].items).toMatchObject([
        {
          productId,
          productName: 'Produk Riwayat',
          quantity: 2,
          unitPrice: String(PRICE),
          lineTotal: String(PRICE * 2),
        },
      ]);
      expect(mine.body[0].user).toBeUndefined();
      expect(mine.body[0].passwordHash).toBeUndefined();

      const otherOrders = await api()
        .get('/api/v1/orders/mine')
        .set('Authorization', bearer(other))
        .expect(200);
      expect(otherOrders.body).toEqual([]);

      await api().get('/api/v1/orders/mine').expect(401);
      await api()
        .get('/api/v1/orders/mine')
        .set('Authorization', bearer(adminToken))
        .expect(403);
    });
  });

  describe('daftar pesanan admin', () => {
    it('mengurutkan pesanan terbaru lebih dulu secara konsisten jika waktu pembuatan sama', async () => {
      const productId = await createProduct(5, 'Produk Urutan Admin');
      const firstCustomer = await registerCustomer('admin-history-first@test.local');
      const secondCustomer = await registerCustomer('admin-history-second@test.local');
      const firstOrder = (
        await placeOrder(firstCustomer, [{ productId, quantity: 1 }]).expect(201)
      ).body;
      const secondOrder = (
        await placeOrder(secondCustomer, [{ productId, quantity: 1 }]).expect(201)
      ).body;

      await prisma.order.updateMany({
        where: { id: { in: [firstOrder.id, secondOrder.id] } },
        data: { createdAt: new Date('2026-10-20T12:00:00.000Z') },
      });

      const allOrders = await api()
        .get('/api/v1/orders')
        .set('Authorization', bearer(adminToken))
        .expect(200);

      expect(allOrders.body.map((order: { id: number }) => order.id)).toEqual([
        secondOrder.id,
        firstOrder.id,
      ]);
      expect(allOrders.body[0].user).toMatchObject({
        id: expect.any(Number),
        email: 'admin-history-second@test.local',
      });
      expect(allOrders.body[0].user.passwordHash).toBeUndefined();
    });
  });

  describe('alur admin', () => {
    it('mencatat perubahan status pesanan, pembayaran, dan pengiriman serta membatasi audit log untuk admin', async () => {
      const productId = await createProduct(5);
      const customer = await registerCustomer('audit-log@test.local');
      const order = (
        await placeOrder(customer, [{ productId, quantity: 1 }], {
          paymentMethod: 'BANK_TRANSFER',
        }).expect(201)
      ).body;

      await adminPatch(`/orders/${order.id}/payment-status`, { status: 'PAID' }).expect(200);
      await adminPatch(`/orders/${order.id}/status`, { status: 'PROCESSING' }).expect(200);
      await adminPatch(`/orders/${order.id}/shipping`, {
        carrier: 'JNE',
        trackingNumber: 'AUDIT123456',
      }).expect(200);

      const logs = await api()
        .get('/api/v1/orders/audit-log')
        .set('Authorization', bearer(adminToken))
        .expect(200);
      expect(logs.body).toHaveLength(3);
      expect(logs.body.map((entry: { action: string }) => entry.action)).toEqual([
        'ORDER_SHIPPED',
        'ORDER_STATUS_UPDATED',
        'ORDER_PAYMENT_UPDATED',
      ]);
      expect(logs.body[2]).toMatchObject({
        actor: { email: ADMIN_EMAIL },
        entityType: 'ORDER',
        entityId: order.id,
        before: { paymentStatus: 'PENDING' },
        after: { paymentStatus: 'PAID' },
      });

      await api().get('/api/v1/orders/audit-log').expect(401);
      await api()
        .get('/api/v1/orders/audit-log')
        .set('Authorization', bearer(customer))
        .expect(403);
    });

    it('membawa order transfer bank dari pembayaran sampai DELIVERED', async () => {
      const productId = await createProduct(3);
      const customer = await registerCustomer('flow@test.local');
      const order = (
        await placeOrder(customer, [{ productId, quantity: 1 }], {
          paymentMethod: 'BANK_TRANSFER',
        }).expect(201)
      ).body;

      // Belum dibayar: tidak boleh diproses.
      await adminPatch(`/orders/${order.id}/status`, { status: 'PROCESSING' }).expect(400);
      await adminPatch(`/orders/${order.id}/payment-status`, { status: 'PAID' }).expect(200);
      await adminPatch(`/orders/${order.id}/status`, { status: 'PROCESSING' }).expect(200);

      // PROCESSING -> SHIPPED harus lewat endpoint shipping.
      await adminPatch(`/orders/${order.id}/status`, { status: 'SHIPPED' }).expect(400);
      const shipped = await adminPatch(`/orders/${order.id}/shipping`, {
        carrier: 'JNE',
        trackingNumber: 'JP1234567890',
      }).expect(200);
      expect(shipped.body).toMatchObject({
        status: 'SHIPPED',
        shippingCarrier: 'JNE',
        trackingNumber: 'JP1234567890',
      });
      expect(shipped.body.shippedAt).toBeTruthy();

      await adminPatch(`/orders/${order.id}/status`, { status: 'DELIVERED' }).expect(200);
      await adminPatch(`/orders/${order.id}/status`, { status: 'CANCELLED' }).expect(400);
      expect(await stockOf(productId)).toBe(2);
    });

    it('mewajibkan refund sebelum order berbayar dibatalkan, lalu mengembalikan stok', async () => {
      const productId = await createProduct(5);
      const customer = await registerCustomer('refund@test.local');
      const order = (await placeOrder(customer, [{ productId, quantity: 2 }]).expect(201)).body;
      await adminPatch(`/orders/${order.id}/payment-status`, { status: 'PAID' }).expect(200);

      await adminPatch(`/orders/${order.id}/status`, { status: 'CANCELLED' }).expect(400);
      await adminPatch(`/orders/${order.id}/payment-status`, { status: 'REFUNDED' }).expect(200);
      const cancelled = await adminPatch(`/orders/${order.id}/status`, {
        status: 'CANCELLED',
      }).expect(200);

      expect(cancelled.body.status).toBe('CANCELLED');
      expect(await stockOf(productId)).toBe(5);
    });

    it('menolak status gagal untuk pembayaran COD', async () => {
      const productId = await createProduct(5);
      const customer = await registerCustomer('cod@test.local');
      const order = (await placeOrder(customer, [{ productId, quantity: 1 }]).expect(201)).body;

      await adminPatch(`/orders/${order.id}/payment-status`, { status: 'FAILED' }).expect(400);
    });
  });

  describe('restock', () => {
    it('menambah stok dan mencatat RESTOCK hanya untuk admin', async () => {
      const productId = await createProduct(3);
      const customer = await registerCustomer('restock@test.local');

      await api()
        .post(`/api/v1/products/${productId}/restock`)
        .set('Authorization', bearer(customer))
        .send({ quantity: 5 })
        .expect(403);
      await api()
        .post(`/api/v1/products/${productId}/restock`)
        .set('Authorization', bearer(adminToken))
        .send({ quantity: 5 })
        .expect(201);

      expect(await stockOf(productId)).toBe(8);
      const restock = (await ledger(productId)).find((m) => m.reason === 'RESTOCK');
      expect(restock).toMatchObject({ delta: 5, stockAfter: 8 });
    });
  });
});