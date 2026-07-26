import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppDataProvider } from "@/context/AppDataContext";
import { AppShell } from "@/components/AppShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TradeOS | Institutional Trading Intelligence",
  description: "Institutional Trading Intelligence platform for professional traders featuring AI-powered research, Gold Research Terminal, Economic Calendar, decision support, analytics, and performance tracking.",
  manifest: "/manifest.json"
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#05070A" }
  ]
};

function ThemeInit() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var t=localStorage.getItem('primasta-theme');var d=t==='light'?false:t==='dark'?true:true;document.documentElement.classList.toggle('dark',d)}catch(e){}})();`
      }}
    />
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeInit />
      </head>
      <body className={inter.className}>
        <AppDataProvider>
          <AppShell>{children}</AppShell>
        </AppDataProvider>
      </body>
    </html>
  );
}
