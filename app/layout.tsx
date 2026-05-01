import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Student Routine Manager",
  description: "Automated student time management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
