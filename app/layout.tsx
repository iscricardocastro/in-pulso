import type { Metadata } from "next";
import { Toaster } from "sonner";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { PwaRegister } from "@/components/pwa-register";
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: "Pulso | InMexico",
  description: "Inventario operativo",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster richColors position="top-right" />
          <PwaRegister />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
