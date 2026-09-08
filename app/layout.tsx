import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import { WalletButton } from "@/components/WalletButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tuitio — milestone-gated tuition escrow on Stellar",
  description:
    "Sponsors fund school terms into escrow. Money releases only to verified institutions, one term at a time.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-neutral-950 text-neutral-100">
        <WalletProvider>
          <header className="border-b border-neutral-800">
            <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
              <div className="flex items-center gap-6">
                <Link href="/" className="font-semibold tracking-tight">
                  Tuitio
                </Link>
                <div className="flex gap-4 text-sm text-neutral-400">
                  <Link href="/" className="hover:text-neutral-100">Dashboard</Link>
                  <Link href="/institutions" className="hover:text-neutral-100">Institutions</Link>
                  <Link href="/sponsor" className="hover:text-neutral-100">Fund a grant</Link>
                </div>
              </div>
              <WalletButton />
            </nav>
          </header>
          <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
          <footer className="border-t border-neutral-800 py-6 text-center text-xs text-neutral-500">
            Tuitio · milestone-gated tuition escrow · Stellar testnet
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
