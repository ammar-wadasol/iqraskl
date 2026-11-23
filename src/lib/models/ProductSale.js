import { Schema, model, models } from "mongoose";

const productSaleSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, required: true, min: 0, default: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    soldOn: { type: Date, required: true },
    note: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

productSaleSchema.index({ product: 1, soldOn: -1 });
productSaleSchema.index({ student: 1, soldOn: -1 });

// Drop the cached model so schema changes (like `discount`) apply after hot reload.
if (models.ProductSale) {
  delete models.ProductSale;
}

export const ProductSale = model("ProductSale", productSaleSchema);
