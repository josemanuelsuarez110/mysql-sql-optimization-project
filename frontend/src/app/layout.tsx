import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MySQL Performance Tuning Portfolio",
  description: "Advanced SQL Optimization, Indexing and Execution Plans",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#09090b] text-zinc-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
