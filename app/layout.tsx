import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kids Sudoku",
  description:
    "A kid-friendly 9×9 Sudoku that starts easy and gets a little harder with every level.",
  applicationName: "Kids Sudoku",
  appleWebApp: {
    capable: true,
    title: "Kids Sudoku",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f8fafc",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {process.env.NODE_ENV === "production" ? (
          <Script id="register-sw" strategy="beforeInteractive">
            {`if("serviceWorker"in navigator){navigator.serviceWorker.register("/sw.js",{updateViaCache:"none"}).catch(()=>{})}`}
          </Script>
        ) : null}
        {children}
      </body>
    </html>
  );
}