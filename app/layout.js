import "./globals.css";
import { Inter, Outfit } from "next/font/google";
import { AppProvider } from "@/context/AppContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import PwaUpdater from "@/components/PwaUpdater";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});

export const metadata = {
  title: "CubeLogs — Unified Workforce Engine",
  description: "Workforce Role Template & Attendance Engine",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CubeLogs",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AppProvider>
            {children}
            <PwaUpdater />
            <PwaInstallPrompt />
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

