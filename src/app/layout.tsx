import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DynamicFavicon from "@/components/DynamicFavicon";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Priyanci Gold | 916 Hallmarked Gold Jewellery | Premium Gold Ornaments",
  description: "Shop exquisite 916 hallmarked gold jewellery at Priyanci Gold. Discover our premium collection of authentic gold rings, necklaces, bangles, earrings & more. BIS certified quality, handcrafted designs, free shipping across India.",
  keywords: "916 gold jewellery, 22 karat gold, hallmarked gold, gold ornaments, gold rings, gold necklaces, gold bangles, gold earrings, pure gold jewelry, BIS hallmark gold, indian gold jewellery, priyanci gold, premium gold collection, handcrafted gold, authentic gold jewelry, 22k gold",
  authors: [{ name: "Priyanci Gold" }],
  creator: "Priyanci Gold",
  publisher: "Priyanci Gold",
  metadataBase: new URL("https://www.priyancigold.com"),
  alternates: {
    canonical: "https://www.priyancigold.com",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://www.priyancigold.com",
    siteName: "Priyanci Gold",
    title: "Priyanci Gold | 916 Hallmarked Gold Jewellery",
    description: "Shop exquisite 916 hallmarked gold jewellery. Premium quality, handcrafted designs, BIS certified authentic gold ornaments.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Priyanci Gold - 916 Hallmarked Gold Jewellery Collection",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Priyanci Gold | 916 Hallmarked Gold Jewellery",
    description: "Shop exquisite 916 hallmarked gold jewellery. Premium quality, handcrafted designs, BIS certified authentic gold ornaments.",
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
        <ThemeProvider>
          <DynamicFavicon />
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

