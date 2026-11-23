"use client";

import { useState } from "react";
import { PackagePlus, Plus, ShoppingBag } from "lucide-react";
import Modal from "./Modal";
import ProductForm from "./ProductForm";
import AddStockForm from "./AddStockForm";
import SaleForm from "./SaleForm";

export function AddProductButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary">
        <Plus className="size-4" aria-hidden="true" />
        Add item
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add item">
        <ProductForm onCancel={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function RecordSaleButton({ product, students, today, compact = false }) {
  const [open, setOpen] = useState(false);
  const outOfStock = product.stock < 1;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={compact ? "btn px-2 py-1.5" : "btn btn-primary"}
        disabled={outOfStock}
        title={outOfStock ? "No stock left" : `Record sale for ${product.name}`}
        aria-label={`Record sale for ${product.name}`}
      >
        <ShoppingBag className="size-4" aria-hidden="true" />
        {compact ? "Sale" : "Record sale"}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Record sale · ${product.name}`}>
        <SaleForm
          product={product}
          students={students}
          today={today}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}

export function ProductDetailActions({ product, students, today }) {
  const [stockOpen, setStockOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <RecordSaleButton product={product} students={students} today={today} />
        <button type="button" onClick={() => setStockOpen(true)} className="btn">
          <PackagePlus className="size-4" aria-hidden="true" />
          Add stock
        </button>
      </div>

      <Modal open={stockOpen} onClose={() => setStockOpen(false)} title={`Add stock · ${product.name}`}>
        <AddStockForm
          productId={product.id}
          onSuccess={() => setStockOpen(false)}
          onCancel={() => setStockOpen(false)}
        />
      </Modal>
    </>
  );
}
