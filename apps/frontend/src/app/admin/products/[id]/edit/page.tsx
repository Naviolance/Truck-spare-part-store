"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { ProductForm, type ProductFormValues } from "@/components/admin/ProductForm";

export default function EditProductPage() {
  const id = useParams().id as string;
  const tc = useTranslations("AdminCommon");
  const [initial, setInitial] = useState<ProductFormValues | null>(null);

  useEffect(() => {
    apiFetch(`/products/admin/${id}`).then(async (res) => {
      const p = await res.json();
      setInitial({
        name: p.name,
        description: p.description,
        descriptionFr: p.descriptionFr ?? "",
        price: String(p.price),
        quantity: String(p.quantity),
        condition: p.condition,
        conditionNotes: p.conditionNotes ?? "",
        categoryId: p.categoryId,
        brandId: p.brandId ?? "",
        partNumber: p.partNumber ?? "",
        crossReference: (p.crossReference ?? []).join(", "),
        imageUrls: p.images?.map((img: { url: string }) => img.url) ?? [],
        vehicleIds: p.compatibility?.map((c: { vehicleId: string }) => c.vehicleId) ?? [],
      });
    });
  }, [id]);

  if (!initial) return <p className="text-steel">{tc("loading")}</p>;
  return <ProductForm productId={id} initial={initial} />;
}
