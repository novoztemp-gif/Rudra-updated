import { useState } from "react";
import { Icons } from "../components/ui/Icons";

export function LoginPage({ onLogin, isLoading }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 text-sm">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex-col items-center justify-center px-8 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl"></div>
          <div className="absolute bottom-10 right-10 w-72 h-72 bg-slate-500 rounded-full mix-blend-multiply filter blur-xl"></div>
        </div>

        <div className="relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md mb-6">
            <div className="w-10 h-10 bg-white rounded flex items-center justify-center text-slate-900 text-lg font-bold">R</div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Rudra Granites</h1>
          <p className="text-slate-300 text-lg mb-12">Point of Sale System</p>

          <div className="max-w-sm mx-auto space-y-6">
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3 text-slate-200 text-sm mb-2">
                <Icons.check size={16} />
                <span>Complete invoice & billing management</span>
              </div>
              <div className="flex items-center gap-3 text-slate-200 text-sm mb-2">
                <Icons.check size={16} />
                <span>E-invoice & E-way bill compliance</span>
              </div>
              <div className="flex items-center gap-3 text-slate-200 text-sm">
                <Icons.check size={16} />
                <span>Real-time inventory tracking</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex lg:w-1/2 flex-col items-center justify-center px-4 py-8 sm:px-8">
        <div className="w-full max-w-sm">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 mb-3">
              <div className="text-white text-sm font-bold">R</div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Rudra Granites</h1>
            <p className="text-slate-500 text-sm">POS System</p>
          </div>

          {/* Login form */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome back</h2>
            <p className="text-slate-500 text-sm mb-8">Enter your credentials to access the system</p>

            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email || !password}
                className="w-full mt-6 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <Icons.lock size={16} />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}
