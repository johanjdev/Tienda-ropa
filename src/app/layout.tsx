import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "../components/Navbar";
import "./globals.css";
import AuthProvider from "../components/AuthProvider";
import CursorFollower from "@/components/CursorFollower";
import FooterGate from "@/components/FooterGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arquetipo",
  description: "Tienda online",
  icons: {
    icon: [
      { url: "/imagenes/faviicon/favicon.ico", sizes: "any" },
      { url: "/imagenes/faviicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/imagenes/faviicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <CursorFollower/>
          <Navbar />
          {children}
          <FooterGate />
        </AuthProvider>
      </body>
    </html>
  );
}
