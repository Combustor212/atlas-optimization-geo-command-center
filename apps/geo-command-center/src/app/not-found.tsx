export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-[var(--muted)]">The page you&apos;re looking for doesn&apos;t exist.</p>
      <a
        href="/dashboard"
        className="mt-6 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Back to Dashboard
      </a>
    </div>
  )
}
