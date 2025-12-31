import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Gautam Gold Palace | 925 Sterling Silver Jewellery | Premium Silver Ornaments",
  description: "Shop exquisite 925 sterling silver jewellery at Gautam Gold Palace. Discover our premium collection of authentic silver rings, necklaces, bracelets, earrings & more. Certified quality, handcrafted designs, free shipping across India.",
  keywords: "925 silver jewellery, sterling silver, silver ornaments, silver rings, silver necklaces, silver bracelets, silver earrings, pure silver jewelry, hallmarked silver, indian silver jewellery, gautam gold palace, premium silver collection, handcrafted silver, authentic silver jewelry",
  authors: [{ name: "Gautam Gold Palace" }],
  creator: "Gautam Gold Palace",
  publisher: "Gautam Gold Palace",
  metadataBase: new URL("https://www.gautam-gold-palace.com"),
  alternates: {
    canonical: "https://www.gautam-gold-palace.com",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://www.gautam-gold-palace.com",
    siteName: "Gautam Gold Palace",
    title: "Gautam Gold Palace | 925 Sterling Silver Jewellery",
    description: "Shop exquisite 925 sterling silver jewellery. Premium quality, handcrafted designs, authentic hallmarked silver ornaments.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Gautam Gold Palace - 925 Sterling Silver Jewellery Collection",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gautam Gold Palace | 925 Sterling Silver Jewellery",
    description: "Shop exquisite 925 sterling silver jewellery. Premium quality, handcrafted designs, authentic hallmarked silver ornaments.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
  category: "Jewellery",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable}`}>
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <Navbar />
              <main className="main-content">
                {children}
              </main>
              <Footer />
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
