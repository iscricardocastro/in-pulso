import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogo
            className="motion-surface mb-3 h-24 w-24 rounded-[1.5rem] bg-card shadow-sm shadow-slate-950/10 ring-1 ring-border/70 dark:bg-foreground/5 dark:shadow-black/20"
            imageClassName="h-20 w-20"
            priority
          />
          <p className="text-sm font-medium text-primary">Pulso</p>
          <h1 className="mt-1 text-2xl font-semibold">Acceso seguro</h1>
        </div>
        <ResetPasswordForm />
        <Link className="mt-5 block text-center text-sm text-primary hover:underline" href="/login">
          Volver a login
        </Link>
      </div>
    </main>
  );
}
