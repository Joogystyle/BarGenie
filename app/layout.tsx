import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "BarGenie",
  description:
    "BarGenie is your AI cocktail bartender: discover drinks from bottles you already own, match every recommendation to your flavor profile, and save favorites to your cellar.",
  openGraph: {
    title: "BarGenie",
    description:
      "Your AI cocktail bartender for personalized recipes, smart substitutions, and a curated community drink library.",
    images: [
      {
        url: "/images/landing-page.png",
        width: 1200,
        height: 630,
        alt: "BarGenie AI cocktail bartender",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BarGenie",
    description:
      "Your AI cocktail bartender for personalized recipes, smart substitutions, and a curated community drink library.",
    images: ["/images/landing-page.png"],
  },
};

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  display: "swap",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair-display",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${playfair.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
