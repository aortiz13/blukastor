import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { DebugBanner } from "@/components/debug/DebugBanner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Smart Forward",
  description: "AI-Powered Smile Design",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <DebugBanner />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
