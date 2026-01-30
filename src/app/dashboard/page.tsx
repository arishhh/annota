import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                AgencyFeedback
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                Logout
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              + New Project
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-800 border border-slate-700 p-6 rounded-xl hover:border-blue-500/50 transition-colors group cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div className="h-10 w-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <span className="font-bold">P{i}</span>
                  </div>
                  <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">Active</span>
                </div>
                <h3 className="text-lg font-semibold mb-1">Project {i}</h3>
                <p className="text-slate-400 text-sm mb-4">Brief description of the feedback project and its status.</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>12 Feedbacks</span>
                  <span>•</span>
                  <span>Last activity 2h ago</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-slate-800/50 border border-dashed border-slate-700 rounded-2xl p-12 text-center text-slate-500">
            <p className="italic underline underline-offset-4 decoration-slate-700">Detailed widgets and statistics coming soon...</p>
          </div>
        </div>
      </main>
    </div>
  );
}
