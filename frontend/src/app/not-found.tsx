import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container-shell py-20">
      <div className="panel p-6">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-textMuted">The page you requested does not exist.</p>
        <Link href="/" className="mt-4 inline-block text-sm font-semibold text-brand">
          Go to homepage
        </Link>
      </div>
    </main>
  );
}
