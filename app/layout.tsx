import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "../components/Header";
import WalletContextProvider from "@/providers/WalletContextProvider";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Solana Utilities",
  description: "A collection of tools for Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletContextProvider>
          <Header />
          <div className="flex">
            <Sidebar />
            <main className="flex-1 transition-all duration-300 ml-[200px] pt-[10vh]">
              {children}
            </main>
          </div>
        </WalletContextProvider>
      </body>
    </html>
  );
}
