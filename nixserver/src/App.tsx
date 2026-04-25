import { useState } from 'react'

export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (email && password) {
      setIsLoggedIn(true)
    }
  }

  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
        <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <h1 className="text-xl font-bold">Nix<span className="text-blue-500">Server</span></h1>
            <button
              onClick={() => setIsLoggedIn(false)}
              className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white transition-colors text-sm"
            >
              Sign out
            </button>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Accounts', icon: '👥', count: '0' },
              { title: 'Domains', icon: '🌐', count: '0' },
              { title: 'Databases', icon: '💾', count: '0' },
              { title: 'Email Accounts', icon: '📧', count: '0' },
              { title: 'SSL Certificates', icon: '🔒', count: '0' },
              { title: 'Backups', icon: '💾', count: '0' },
            ].map((item) => (
              <div key={item.title} className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-3xl font-bold text-blue-500">{item.count}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-blue-900/20 border border-blue-500/20 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to NixServer</h2>
            <p className="text-gray-400">
              This is a placeholder dashboard. Full server management features are coming soon.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Nix<span className="text-blue-500">Server</span>
          </h1>
          <p className="text-gray-400">Admin Control Panel</p>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors mt-6"
            >
              Sign in
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          NixPanel Server Admin — Login with your credentials
        </p>
      </div>
    </div>
  )
}
