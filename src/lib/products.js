import "server-only";
import { isValidObjectId } from "mongoose";
import { connectDB } from "./db";
import { Product } from "./models/Product";
import { ProductSale } from "./models/ProductSale";
import { Student } from "./models/Student";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseProductFilters(searchParams) {
  const page = Number.parseInt(searchParams.page, 10);
  return {
    name: typeof searchParams.name === "string" ? searchParams.name.trim().slice(0, 100) : "",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export const PRODUCT_PAGE_SIZE = 20;

export async function listActiveStudentsForSale() {
  await connectDB();
  const students = await Student.find({ status: "active" })
    .select("studentId name fatherName className")
    .sort({ name: 1, studentId: 1 })
    .lean();
  return students.map((s) => ({
    id: String(s._id),
    studentId: s.studentId,
    name: s.name,
    fatherName: s.fatherName,
    className: s.className,
  }));
}

export async function listProducts(filters) {
  await connectDB();
  const query = {};
  if (filters.name) {
    query.name = { $regex: escapeRegex(filters.name), $options: "i" };
  }

  const total = await Product.countDocuments(query);
  const pageCount = Math.max(Math.ceil(total / PRODUCT_PAGE_SIZE), 1);
  const page = Math.min(filters.page, pageCount);
  const products = await Product.find(query)
    .sort({ name: 1 })
    .skip((page - 1) * PRODUCT_PAGE_SIZE)
    .limit(PRODUCT_PAGE_SIZE)
    .lean();

  const ids = products.map((p) => p._id);
  const sold = ids.length
    ? await ProductSale.aggregate([
        { $match: { product: { $in: ids } } },
        {
          $group: {
            _id: "$product",
            quantitySold: { $sum: "$quantity" },
            revenue: { $sum: "$amountPaid" },
            buyers: { $addToSet: "$student" },
          },
        },
      ])
    : [];
  const soldMap = new Map(sold.map((row) => [String(row._id), row]));

  return {
    total,
    page,
    pageCount,
    products: products.map((p) => {
      const stats = soldMap.get(String(p._id));
      return {
        id: String(p._id),
        name: p.name,
        description: p.description || "",
        unitPrice: p.unitPrice,
        stock: p.stock,
        quantitySold: stats?.quantitySold ?? 0,
        revenue: stats?.revenue ?? 0,
        buyerCount: stats?.buyers?.length ?? 0,
      };
    }),
  };
}

export async function getProductDetail(id) {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  const product = await Product.findById(id).lean();
  if (!product) return null;

  const [sales, students] = await Promise.all([
    ProductSale.find({ product: id }).sort({ soldOn: -1, createdAt: -1 }).lean(),
    Student.find({ status: "active" })
      .select("studentId name fatherName className")
      .sort({ name: 1, studentId: 1 })
      .lean(),
  ]);

  const studentIds = [...new Set(sales.map((s) => String(s.student)))];
  const saleStudents = studentIds.length
    ? await Student.find({ _id: { $in: studentIds } })
        .select("studentId name fatherName className")
        .lean()
    : [];
  const studentMap = new Map(saleStudents.map((s) => [String(s._id), s]));

  return {
    product: {
      id: String(product._id),
      name: product.name,
      description: product.description || "",
      unitPrice: product.unitPrice,
      stock: product.stock,
    },
    sales: sales.map((s) => {
      const student = studentMap.get(String(s.student));
      return {
        id: String(s._id),
        quantity: s.quantity,
        unitPrice: s.unitPrice,
        totalAmount: s.totalAmount,
        amountPaid: s.amountPaid,
        discount: s.discount || 0,
        remaining: Math.max(s.totalAmount - s.amountPaid - (s.discount || 0), 0),
        soldOn: s.soldOn,
        note: s.note || "",
        student: student
          ? {
              id: String(student._id),
              studentId: student.studentId,
              name: student.name,
              fatherName: student.fatherName,
              className: student.className,
            }
          : null,
      };
    }),
    students: students.map((s) => ({
      id: String(s._id),
      studentId: s.studentId,
      name: s.name,
      fatherName: s.fatherName,
      className: s.className,
    })),
  };
}
