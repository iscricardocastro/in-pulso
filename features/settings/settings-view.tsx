"use client";

import { Building2, ImageUp, Save, Upload, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { lookupMexicoPostalCode } from "@/features/customers/utils/postal-code";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { updateCompanySettings } from "@/services/settings";
import type { Tenant } from "@/types/database";

const IMAGE_BUCKET = "company-images";

type CompanySettingsDraft = {
  name: string;
  slug: string;
  legal_name: string;
  tax_id: string;
  phone: string;
  email: string;
  address: string;
  postal_code: string;
  city: string;
  state: string;
  country: string;
  image_url: string;
  image_path: string;
};

export function SettingsView({ company }: { company: Tenant }) {
  const [draft, setDraft] = useState<CompanySettingsDraft>(() => ({
    name: company.name,
    slug: company.slug,
    legal_name: company.legal_name ?? "",
    tax_id: company.tax_id ?? "",
    phone: company.phone ?? "",
    email: company.email ?? "",
    address: company.address ?? "",
    postal_code: company.postal_code ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    country: company.country ?? "",
    image_url: company.image_url ?? "",
    image_path: company.image_path ?? "",
  }));
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!file) {
      setFilePreviewUrl("");
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setFilePreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  const previewUrl = filePreviewUrl || draft.image_url;

  function updateField(field: keyof CompanySettingsDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function inferAddressFromPostalCode(postalCode: string) {
    const inferred = await lookupMexicoPostalCode(postalCode);
    if (!inferred) return;
    setDraft((current) => ({
      ...current,
      country: inferred.country,
      state: inferred.state,
      city: inferred.city ?? current.city,
    }));
  }

  function selectImage(selected: File | null) {
    if (!selected) return;
    if (!selected.type.startsWith("image/")) {
      toast.error("Selecciona una imagen valida");
      return;
    }
    if (selected.size > 2 * 1024 * 1024) {
      toast.error("La imagen debe pesar maximo 2 MB");
      return;
    }
    setFile(selected);
  }

  function clearImage() {
    setFile(null);
    setDraft((current) => ({ ...current, image_url: "", image_path: "" }));
  }

  function save() {
    startTransition(async () => {
      try {
        let imageUrl = draft.image_url;
        let imagePath = draft.image_path;

        if (file) {
          const supabase = createSupabaseBrowserClient();
          const extension = file.name.split(".").pop()?.toLowerCase() ?? "png";
          const path = `${company.id}/company-${Date.now()}.${extension}`;
          const { error: uploadError } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
            cacheControl: "3600",
            upsert: true,
          });
          if (uploadError) throw new Error(uploadError.message);
          const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
          imageUrl = data.publicUrl;
          imagePath = path;
        }

        await updateCompanySettings({ ...draft, image_url: imageUrl, image_path: imagePath });
        setDraft((current) => ({ ...current, image_url: imageUrl, image_path: imagePath }));
        setFile(null);
        toast.success("Configuracion guardada");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configuracion</h1>
          <p className="text-sm text-muted-foreground">Datos de compania usados por operacion, reportes y tickets.</p>
        </div>
        <Button disabled={pending || !draft.name.trim() || !draft.slug.trim()} type="button" onClick={save}>
          <Save className="h-4 w-4" />
          {pending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Datos de compania
            </CardTitle>
            <CardDescription>Informacion editable por tenant.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Nombre comercial">
              <Input autoComplete="organization" value={draft.name} onChange={(event) => updateField("name", event.target.value)} />
            </Field>
            <Field label="Slug">
              <Input value={draft.slug} onChange={(event) => updateField("slug", event.target.value)} />
            </Field>
            <Field label="Razon social">
              <Input value={draft.legal_name} onChange={(event) => updateField("legal_name", event.target.value)} />
            </Field>
            <Field label="RFC / ID fiscal">
              <Input value={draft.tax_id} onChange={(event) => updateField("tax_id", event.target.value)} />
            </Field>
            <Field label="Telefono">
              <Input autoComplete="tel" value={draft.phone} onChange={(event) => updateField("phone", event.target.value)} />
            </Field>
            <Field label="Correo">
              <Input autoComplete="email" type="email" value={draft.email} onChange={(event) => updateField("email", event.target.value)} />
            </Field>
            <Field className="md:col-span-2" label="Direccion">
              <Textarea value={draft.address} onChange={(event) => updateField("address", event.target.value)} />
            </Field>
            <Field label="Codigo postal">
              <Input
                autoComplete="postal-code"
                inputMode="numeric"
                value={draft.postal_code}
                onBlur={(event) => inferAddressFromPostalCode(event.target.value)}
                onChange={(event) => updateField("postal_code", event.target.value)}
              />
            </Field>
            <Field label="Municipio / ciudad">
              <Input autoComplete="address-level2" value={draft.city} onChange={(event) => updateField("city", event.target.value)} />
            </Field>
            <Field label="Estado">
              <Input autoComplete="address-level1" value={draft.state} onChange={(event) => updateField("state", event.target.value)} />
            </Field>
            <Field label="Pais">
              <Input autoComplete="country-name" value={draft.country} onChange={(event) => updateField("country", event.target.value)} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageUp className="h-5 w-5 text-primary" />
              Imagen de compania
            </CardTitle>
            <CardDescription>Logo o imagen para identificar la compania.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border/80 bg-muted/45">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={`Imagen de ${draft.name || "compania"}`} className="h-full w-full object-contain p-4" src={previewUrl} />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImageUp className="h-10 w-10" />
                  <p className="text-sm">Sin imagen</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-image">Subir imagen</Label>
              <Input
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                id="company-image"
                type="file"
                onChange={(event) => selectImage(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">PNG, JPG, WebP o SVG. Maximo 2 MB.</p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button className="flex-1" disabled={!previewUrl || pending} type="button" variant="secondary" onClick={clearImage}>
                <X className="h-4 w-4" />
                Quitar imagen
              </Button>
              <Button className="flex-1" disabled={pending} type="button" variant="outline" onClick={save}>
                <Upload className="h-4 w-4" />
                Subir y guardar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className ? `space-y-2 ${className}` : "space-y-2"}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
