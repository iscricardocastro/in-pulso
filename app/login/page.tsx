import { Suspense } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandLogo
            className="motion-surface mb-3 h-28 w-28 rounded-[1.75rem] bg-card shadow-sm shadow-slate-950/10 ring-1 ring-border/70 dark:bg-foreground/5 dark:shadow-black/20"
            imageClassName="h-24 w-24"
            priority
          />
          <p className="text-sm font-medium text-primary">InMexico</p>
          <h1 className="mt-1 text-3xl font-semibold">Pulso</h1>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
