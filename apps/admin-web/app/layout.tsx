import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import { SocketProvider } from "@/context/socket-context";
import { SettingsProvider } from "@/context/settings-context";
import MainLayout from "@/components/layout/MainLayout";
import serverApi from "@/lib/server-api";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { AlertProvider } from "@/components/ui/CustomAlert";

// Using Inter as a proxy for Stack Sans Text since we don't have the proprietary files
const stackSansText = Inter({
  subsets: ["latin"],
  variable: "--font-stack-text",
  display: "swap",
});

// Using Inter with tighter tracking for Headline feel
const stackSansHeadline = Inter({
  subsets: ["latin"],
  variable: "--font-stack-headline",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

async function getUser() {
  try {
    const { data } = await serverApi.get('/auth/me');
    return data;
  } catch (error) {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();

  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${stackSansText.variable} ${stackSansHeadline.variable} font-sans antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <I18nProvider>
            <AlertProvider>
              <AuthProvider initialUser={user}>
                <SettingsProvider>
                  <SocketProvider>
                    <MainLayout>{children}</MainLayout>
                  </SocketProvider>
                </SettingsProvider>
              </AuthProvider>
            </AlertProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
