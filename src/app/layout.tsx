import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Trinity Ad Generator",
  description: "Internes Tool für die Erstellung von Werbe-Creatives",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={jakartaSans.variable}>
      <body className="bg-surface text-ink antialiased">{children}</body>
    </html>
  );
}
