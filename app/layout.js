import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import PwaUpdater from "@/components/PwaUpdater";

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
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AppProvider>
            {children}
            <PwaUpdater />
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

