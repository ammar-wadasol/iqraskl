"use server";

import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { parseISODate } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { Product } from "@/lib/models/Product";
import { ProductSale } from "@/lib/models/ProductSale";
import { Student } from "@/lib/models/Student";
import {
  amount,
  firstError,
  formValues,
  isoDate,
  optionalText,
  requiredText,
} from "@/lib/validation";

const objectId = (label) => z.string().refine(isValidObjectId, `Invalid ${label}.`);

const createSchema = z.object({
  name: requiredText("Item name", 100),
  description: optionalText(200),
  unitPrice: amount,
  stock: z.coerce
    .number({ error: "Enter stock quantity." })
    .int("Stock must be a whole number.")
    .min(0, "Stock cannot be negative.")
    .max(1_000_000, "Stock is too large."),
});

const stockSchema = z.object({
  product: objectId("item"),
  quantity: z.coerce
    .number({ error: "Enter quantity." })
    .int("Quantity must be a whole number.")
    .min(1, "Add at least 1 item.")
    .max(1_000_000, "Quantity is too large."),
});

const saleSchema = z.object({
  product: objectId("item"),
  student: objectId("student"),
  quantity: z.coerce
    .number({ error: "Enter quantity." })
    .int("Quantity must be a whole number.")
    .min(1, "Sell at least 1 item.")
    .max(10_000, "Quantity is too large."),
  amountPaid: amount,
  discount: amount,
  soldOn: isoDate,
  note: optionalText(200),
});

export async function createProduct(_prevState, formData) {
  await requireAdmin();
  const parsed = createSchema.safeParse(
    formValues(formData, ["name", "description", "unitPrice", "stock"]),
  );
  if (!parsed.success) return { error: firstError(parsed) };
  const data = parsed.data;

  await connectDB();
  let product;
  try {
    product = await Product.create({
      name: data.name,
      description: data.description,
      unitPrice: data.unitPrice,
      stock: data.stock,
    });
  } catch (error) {
    if (error?.code === 11000) return { error: "An item with this name already exists." };
    throw error;
  }

  redirect(`/products/${product._id}`);
}

export async function addStock(_prevState, formData) {
  await requireAdmin();
  const parsed = stockSchema.safeParse(formValues(formData, ["product", "quantity"]));
  if (!parsed.success) return { error: firstError(parsed) };
  const data = parsed.data;

  await connectDB();
  const result = await Product.updateOne(
    { _id: data.product },
    { $inc: { stock: data.quantity } },
  );
  if (result.matchedCount === 0) return { error: "Item not found." };

  refresh();
  return { ok: true, message: `Added ${data.quantity} to stock.` };
}

export async function recordSale(_prevState, formData) {
  await requireAdmin();
  const parsed = saleSchema.safeParse(
    formValues(formData, [
      "product",
      "student",
      "quantity",
      "amountPaid",
      "discount",
      "soldOn",
      "note",
    ]),
  );
  if (!parsed.success) return { error: firstError(parsed) };
  const data = parsed.data;

  await connectDB();
  const [product, student] = await Promise.all([
    Product.findById(data.product).select("name unitPrice stock").lean(),
    Student.findById(data.student).select("_id").lean(),
  ]);
  if (!product) return { error: "Item not found." };
  if (!student) return { error: "Student not found." };

  const totalAmount = product.unitPrice * data.quantity;
  if (data.amountPaid + data.discount > totalAmount) {
    return {
      error: `Paid + discount cannot exceed ${formatMoney(totalAmount)} for this sale.`,
    };
  }
  if (product.stock < data.quantity) {
    return { error: `Only ${product.stock} in stock.` };
  }

  const stockResult = await Product.updateOne(
    { _id: data.product, stock: { $gte: data.quantity } },
    { $inc: { stock: -data.quantity } },
  );
  if (stockResult.modifiedCount !== 1) {
    return { error: "Not enough stock. Refresh and try again." };
  }

  const remaining = totalAmount - data.amountPaid - data.discount;

  try {
    await ProductSale.create({
      product: data.product,
      student: data.student,
      quantity: data.quantity,
      unitPrice: product.unitPrice,
      totalAmount,
      amountPaid: data.amountPaid,
      discount: data.discount,
      soldOn: parseISODate(data.soldOn),
      note: data.note,
    });
  } catch (error) {
    await Product.updateOne({ _id: data.product }, { $inc: { stock: data.quantity } });
    throw error;
  }

  refresh();
  return {
    ok: true,
    message:
      remaining === 0
        ? `Sold ${data.quantity} × ${product.name}. Dues cleared.`
        : `Sold ${data.quantity} × ${product.name}. Remaining ${formatMoney(remaining)}.`,
  };
}
