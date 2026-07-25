import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";
import { ThemeScript } from "@/components/theme/ThemeScript";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jen Fit",
  description:
    "Jen Fit — pierde peso, reduce grasa y mantén tu masa muscular con seguimiento nutricional, entrenamiento y gamificación diseñados para ti.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf8f4" },
    { media: "(prefers-color-scheme: dark)", color: "#211823" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable} h-full`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
