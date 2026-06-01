import type { Metadata } from "next";
import "@/app/globals.css";
import { ClientEffects } from "@/components/client-effects";

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.getItem("theme");var s=window.matchMedia("(prefers-color-scheme: dark)").matches;if(t==="dark"||(!t&&s))document.documentElement.classList.add("dark")}catch(e){}',
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <ClientEffects />
      </body>
    </html>
  );
}
