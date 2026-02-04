import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";
import MainLayout from "@/components/layout/MainLayout";
import serverApi from "@/lib/server-api";

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
    <html lang="es" className="dark">
      <body
        className={`${stackSansText.variable} ${stackSansHeadline.variable} font-sans antialiased`}
      >
        <AuthProvider initialUser={user}>
          <MainLayout>{children}</MainLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
