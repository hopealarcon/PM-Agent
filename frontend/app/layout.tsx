import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PM Agent",
  description: "Tu project manager con IA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className={`${geist.className} min-h-full bg-gray-50 text-gray-900`}>
        <nav className="bg-white border-b border-gray-200 px-6 py-4">
          <a href="/" className="text-lg font-semibold text-indigo-600">PM Agent</a>
        </nav>
        <main className="max-w-4xl mx-auto px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
