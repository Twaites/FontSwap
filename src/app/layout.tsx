import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Font Swap",
  description: "Live Font Preview & Replacement Tool. Visualize Google Fonts on any website instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Analytics for fontswap.twaites.com */}
        <Script
          defer
          data-domain="fontswap.twaites.com"
          src="https://analytics.twaites.com/js/script.js"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}
