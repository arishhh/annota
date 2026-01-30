import Link from "next/link";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start max-w-2xl text-center sm:text-left">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
          Agency Feedback Tool
        </h1>
        <p className="text-xl text-slate-300">
          The ultimate platform for agencies to collect, manage, and act on
          client feedback efficiently.
        </p>

        <div className="flex gap-4 items-center flex-col sm:flex-row mt-4">
          <Link
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-blue-600 text-white gap-2 hover:bg-blue-700 text-sm sm:text-base h-10 sm:h-12 px-8 sm:px-10 font-semibold"
            href="/dashboard"
          >
            Go to Dashboard
          </Link>
          <Link
            className="rounded-full border border-solid border-slate-700 transition-colors flex items-center justify-center hover:bg-slate-800 hover:border-slate-600 text-sm sm:text-base h-10 sm:h-12 px-8 sm:px-10 font-semibold"
            href="/login"
          >
            Login
          </Link>
        </div>
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center text-slate-500 text-sm italic">
        © 2026 Agency Feedback Tool. Built for high-performance teams.
      </footer>
    </div>
  );
}
