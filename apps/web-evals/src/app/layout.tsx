import type { Metadata } from "next"
// Avoid downloading fonts in CI

import { ThemeProvider, ReactQueryProvider } from "@/components/providers"
import { Toaster } from "@/components/ui"
import { Header } from "@/components/layout/header"

import "./globals.css"

const fontSans = { variable: "" }
const fontMono = { variable: "" }

export const metadata: Metadata = {
	title: "Roo Code Evals",
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en">
			<body className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased pb-12`}>
				<ThemeProvider attribute="class" forcedTheme="dark" disableTransitionOnChange>
					<ReactQueryProvider>
						<Header />
						{children}
					</ReactQueryProvider>
				</ThemeProvider>
				<Toaster />
			</body>
		</html>
	)
}
