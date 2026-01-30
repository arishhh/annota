import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-slate-900 text-white">
      <div className="w-full max-w-md space-y-8 bg-slate-800 p-10 rounded-2xl shadow-xl border border-slate-700">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Login</h2>
          <p className="mt-2 text-slate-400">Welcome back to Agency Feedback Tool</p>
        </div>
        <div className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="p-4 bg-slate-700 rounded-md border border-slate-600 text-center italic text-slate-400">
              Authentication implementation coming soon...
            </div>
          </div>

          <div>
            <Link
              href="/"
              className="flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
