import { getGitHubStars, getVSCodeDownloads } from "@/lib/stats"

import { NavBar, Footer } from "@/components/chromes"

// Invalidate cache when a request comes in, at most once every hour.
export const revalidate = 3600
// Skip static generation in CI to avoid network fetch failures
export const dynamic = "force-dynamic"

export default async function Shell({ children }: { children: React.ReactNode }) {
	const fetchStats = !process.env.CI
	const [stars, downloads] = fetchStats ? await Promise.all([getGitHubStars(), getVSCodeDownloads()]) : [null, null]

	return (
		<div className="flex min-h-screen flex-col bg-background text-foreground">
			<NavBar stars={stars} downloads={downloads} />
			<main className="flex-1">{children}</main>
			<Footer />
		</div>
	)
}
