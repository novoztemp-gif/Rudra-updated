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
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-100 border-t-brand-800 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-900 flex-col items-center justify-center px-8 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="absolute top-10 left-10 w-72 h-72 bg-accent-400 rounded-full mix-blend-multiply filter blur-xl"></div>
          <div className="absolute bottom-10 right-10 w-72 h-72 bg-brand-400 rounded-full mix-blend-multiply filter blur-xl"></div>
        </div>

        <div className="relative z-10 text-center">
          <h1 className="text-2xl font-semibold text-white tracking-wide mb-1">RUDRA GRANITES</h1>
          <p className="text-accent-400 text-sm font-semibold tracking-widest mb-12">POS SYSTEM</p>

          <div className="max-w-sm mx-auto space-y-6">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-left">
              <div className="flex items-center gap-3 text-brand-100 text-sm mb-2">
                <Icons.check size={16} className="text-accent-400 shrink-0" />
                <span>Complete invoice &amp; billing management</span>
              </div>
              <div className="flex items-center gap-3 text-brand-100 text-sm mb-2">
                <Icons.check size={16} className="text-accent-400 shrink-0" />
                <span>E-invoice &amp; E-way bill compliance</span>
              </div>
              <div className="flex items-center gap-3 text-brand-100 text-sm">
                <Icons.check size={16} className="text-accent-400 shrink-0" />
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
            <h1 className="text-lg font-semibold text-brand-900 tracking-wide">RUDRA GRANITES</h1>
            <p className="text-accent-600 text-xs font-semibold tracking-widest">POS SYSTEM</p>
          </div>

          {/* Login form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-semibold text-brand-900 mb-2">Welcome back</h2>
            <p className="text-gray-500 text-sm mb-8">Enter your credentials to access the system</p>

            {error && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="w-full px-4 py-2.5 rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email || !password}
                className="w-full mt-6 px-4 py-2.5 bg-brand-900 text-white text-sm font-medium rounded-md hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
