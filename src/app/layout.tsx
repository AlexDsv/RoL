import type { Metadata, Viewport } from "next";
import { Cinzel, Inter } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["600", "700", "800"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rift Gauntlet",
  description:
    "Fan-game non officiel et gratuit dans l'univers de League of Legends : choisis ton champion, affronte-les tous un par un, puis la jungle, les dragons et le Baron Nashor.",
};

export const viewport: Viewport = {
  themeColor: "#010a13",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${cinzel.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
