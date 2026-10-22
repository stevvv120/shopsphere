import "dotenv/config";
import { createServer } from "node:http";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 3001);
const maxBodyBytes = 1_000_000;
const productFields = ["name", "description", "price", "stock", "categoryId"];
const categoryFields = ["name", "slug"];
const categoryCount = { _count: { select: { products: true } } };

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(data));
}

function serializeProduct(product) {
  return {
    ...product,
    price: product.price.toString(),
  };
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new HttpError(400, "id must be a positive integer.");
  }
  return id;
}

function parseName(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(400, "name must be a non-empty string.");
  }

  const name = value.trim();
  if (name.length > 200) {
    throw new HttpError(400, "name must be 200 characters or fewer.");
  }
  return name;
}

function parseCategoryName(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(400, "name must be a non-empty string.");
  }

  const name = value.trim();
  if (name.length > 100) {
    throw new HttpError(400, "category name must be 100 characters or fewer.");
  }
  return name;
}

function parseSlug(value) {
  if (typeof value !== "string") {
    throw new HttpError(400, "slug must be a lowercase URL-friendly string.");
  }

  const slug = value.trim();
  if (slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new HttpError(400, "slug must use lowercase letters, numbers, and single hyphens.");
  }
  return slug;
}

function slugFromName(name) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parsePrice(value) {
  if (typeof value !== "number" && typeof value !== "string") {
    throw new HttpError(400, "price must be a number with up to 2 decimal places.");
  }

  const price = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(price) || Number(price) > 99_999_999.99) {
    throw new HttpError(400, "price must be between 0 and 99999999.99, with up to 2 decimal places.");
  }
  return price;
}

function parseStock(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new HttpError(400, "stock must be a non-negative integer.");
  }
  return value;
}

function parseDescription(value) {
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new HttpError(400, "description must be a string or null.");
  }

  const description = value.trim();
  if (description.length > 4000) {
    throw new HttpError(400, "description must be 4000 characters or fewer.");
  }
  return description || null;
}

function parseCategoryId(value) {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new HttpError(400, "categoryId must be a positive integer or null.");
  }
  return value;
}

function assertAllowedKeys(body, allowedFields) {
  const unknown = Object.keys(body).filter((key) => !allowedFields.includes(key));
  if (unknown.length > 0) {
    throw new HttpError(400, "Unsupported field(s): " + unknown.join(", ") + ".");
  }
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        tooLarge = true;
        chunks.length = 0;
      } else if (!tooLarge) {
        chunks.push(chunk);
      }
    });

    request.on("end", () => {
      if (tooLarge) {
        reject(new HttpError(413, "Request body is too large."));
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new HttpError(400, "Request body must contain valid JSON."));
      }
    });

    request.on("error", reject);
  });
}

function requireObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "Request body must be a JSON object.");
  }
  return value;
}

function productDataFromBody(body, partial = false) {
  assertAllowedKeys(body, productFields);
  const keys = Object.keys(body);
  if (partial && keys.length === 0) {
    throw new HttpError(400, "Provide at least one product field to update.");
  }

  const data = {};
  if (!partial || Object.hasOwn(body, "name")) data.name = parseName(body.name);
  if (!partial || Object.hasOwn(body, "price")) data.price = parsePrice(body.price);
  if (Object.hasOwn(body, "description")) data.description = parseDescription(body.description);
  if (Object.hasOwn(body, "stock")) data.stock = parseStock(body.stock);
  if (Object.hasOwn(body, "categoryId")) data.categoryId = parseCategoryId(body.categoryId);
  return data;
}

function categoryDataFromBody(body, partial = false) {
  assertAllowedKeys(body, categoryFields);
  const keys = Object.keys(body);
  if (partial && keys.length === 0) {
    throw new HttpError(400, "Provide name and/or slug to update.");
  }

  const data = {};
  if (!partial || Object.hasOwn(body, "name")) data.name = parseCategoryName(body.name);
  if (!partial || Object.hasOwn(body, "slug")) {
    const sourceName = data.name;
    const rawSlug = body.slug ?? (sourceName ? slugFromName(sourceName) : undefined);
    data.slug = parseSlug(rawSlug);
  }
  return data;
}

async function handleProducts(request, response, segments) {
  const method = request.method ?? "GET";

  if (segments.length === 1 && method === "GET") {
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { id: "asc" },
    });
    sendJson(response, 200, products.map(serializeProduct));
    return true;
  }

  if (segments.length === 1 && method === "POST") {
    const body = requireObject(await readJson(request));
    const product = await prisma.product.create({
      data: productDataFromBody(body),
      include: { category: true },
    });
    sendJson(response, 201, serializeProduct(product));
    return true;
  }

  if (segments.length !== 2) return false;
  const id = parseId(segments[1]);

  if (method === "GET") {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product) throw new HttpError(404, "Product not found.");
    sendJson(response, 200, serializeProduct(product));
    return true;
  }

  if (method === "PATCH") {
    const body = requireObject(await readJson(request));
    const product = await prisma.product.update({
      where: { id },
      data: productDataFromBody(body, true),
      include: { category: true },
    });
    sendJson(response, 200, serializeProduct(product));
    return true;
  }

  if (method === "DELETE") {
    await prisma.product.delete({ where: { id } });
    response.writeHead(204);
    response.end();
    return true;
  }

  return false;
}

async function handleCategories(request, response, segments) {
  const method = request.method ?? "GET";

  if (segments.length === 1 && method === "GET") {
    const categories = await prisma.category.findMany({
      include: categoryCount,
      orderBy: { name: "asc" },
    });
    sendJson(response, 200, categories);
    return true;
  }

  if (segments.length === 1 && method === "POST") {
    const body = requireObject(await readJson(request));
    const data = categoryDataFromBody(body);
    const category = await prisma.category.create({
      data,
      include: categoryCount,
    });
    sendJson(response, 201, category);
    return true;
  }

  if (segments.length !== 2) return false;
  const id = parseId(segments[1]);

  if (method === "GET") {
    const category = await prisma.category.findUnique({
      where: { id },
      include: categoryCount,
    });
    if (!category) throw new HttpError(404, "Category not found.");
    sendJson(response, 200, category);
    return true;
  }

  if (method === "PATCH") {
    const body = requireObject(await readJson(request));
    const data = categoryDataFromBody(body, true);
    if (Object.hasOwn(body, "name") && !Object.hasOwn(body, "slug")) {
      delete data.slug;
    }
    const category = await prisma.category.update({
      where: { id },
      data,
      include: categoryCount,
    });
    sendJson(response, 200, category);
    return true;
  }

  if (method === "DELETE") {
    await prisma.category.delete({ where: { id } });
    response.writeHead(204);
    response.end();
    return true;
  }

  return false;
}

async function handleRequest(request, response) {
  try {
    const url = new URL(request.url ?? "/", "http://" + host + ":" + port);
    const segments = url.pathname.split("/").filter(Boolean);
    const method = request.method ?? "GET";

    if (method === "GET" && url.pathname === "/health") {
      await prisma.$queryRawUnsafe("SELECT 1");
      sendJson(response, 200, { status: "ok", database: "connected" });
      return;
    }

    if (segments[0] === "products" && await handleProducts(request, response, segments)) return;
    if (segments[0] === "categories" && await handleCategories(request, response, segments)) return;

    sendJson(response, 404, { error: "Route not found." });
  } catch (error) {
    if (response.headersSent) {
      response.destroy();
      return;
    }

    if (error instanceof HttpError) {
      sendJson(response, error.status, { error: error.message });
      return;
    }

    if (error?.code === "P2025") {
      sendJson(response, 404, { error: "Record not found." });
      return;
    }

    if (error?.code === "P2002") {
      sendJson(response, 409, { error: "A category with that name or slug already exists." });
      return;
    }

    if (error?.code === "P2003") {
      sendJson(response, 400, { error: "The selected category does not exist." });
      return;
    }

    console.error(error);
    sendJson(response, 500, { error: "Internal server error." });
  }
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

const server = createServer(handleRequest);
server.listen(port, host, () => {
  console.log("ShopSphere API listening at http://" + host + ":" + port);
});

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
