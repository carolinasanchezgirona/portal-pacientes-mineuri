import type { Metadata } from "next";
import { Merriweather, Sora } from "next/font/google";
import "./globals.css";

// Merriweather: solo titulares (H1/H2) — "Merriweather habla"
const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-brand-loaded",
  display: "swap",
});

// Sora: interfaz, botones, texto general — "Sora trabaja"
const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ui-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mineuri — Portal de pacientes",
  description: "Área de seguimiento para pacientes y profesionales de Mineuri.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${merriweather.variable} ${sora.variable}`}>
      <body>{children}</body>
    </html>
  );
}
