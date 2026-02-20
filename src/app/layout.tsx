import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RestorationSidebar } from "@/components/RestorationSidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Optics Restoration Studio",
    description: "State-of-the-art optical image restoration solution",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.className} min-h-screen flex text-white bg-black overflow-x-hidden`}>
                <div className="flex-shrink-0">
                    <RestorationSidebar />
                </div>
                <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
                    {children}
                </main>
            </body>
        </html>
    );
}
