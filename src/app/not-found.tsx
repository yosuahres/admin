import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
      <div className="w-24 border-t border-gray-200" />
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
        Back to home
      </Link>
    </div>
  );
}
