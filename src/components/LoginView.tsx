import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { School, LogIn, AlertCircle, Eye, EyeOff, Loader2, ExternalLink } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

export const LoginView: React.FC = () => {
  const { login, error, errorCode, setError } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Harap masukkan Username / Email dan Kata Sandi.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(identifier, password);
    } catch (err: any) {
      setError('Terjadi kesalahan saat masuk. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOperationNotAllowed =
    errorCode === 'auth/operation-not-allowed' ||
    (error && error.includes('Metode login Email/Password belum diaktifkan'));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 mb-4">
          <School className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          AKSARA
        </h1>
        <p className="mt-1.5 text-sm font-medium text-slate-600">
          Sistem Informasi Manajemen Akademik dan Administrasi Sekolah
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-slate-200 rounded-2xl">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Masuk ke Sistem</h2>
            <p className="text-xs text-slate-500 mt-1">
              Silakan masukkan Username atau Email terdaftar beserta Kata Sandi Anda.
            </p>
          </div>

          {/* Operation Not Allowed Firebase Console Guide */}
          {isOperationNotAllowed ? (
            <div
              id="login-provider-alert"
              className="mb-5 p-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl space-y-2.5 shadow-xs"
            >
              <div className="flex items-start gap-2.5 font-semibold text-amber-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                <span>Metode login Email/Password belum diaktifkan pada Firebase Authentication. Aktifkan provider Email/Password pada Firebase Console.</span>
              </div>
              <div className="bg-white/80 rounded-lg p-2.5 border border-amber-200 text-slate-700 space-y-1.5 text-[11px] leading-relaxed">
                <div className="font-semibold text-slate-900">Langkah mengaktifkan di Firebase Console:</div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>Buka <strong>Firebase Console</strong> pada project: <code className="bg-amber-100/70 px-1 py-0.5 rounded text-amber-900 font-mono font-bold">{firebaseConfig.projectId}</code></li>
                  <li>Pilih menu <strong>Authentication</strong> &gt; tab <strong>Sign-in method</strong>.</li>
                  <li>Klik pada baris <strong>Email/Password</strong>.</li>
                  <li>Aktifkan sakelar (toggle) <strong>Enable</strong> lalu klik <strong>Save</strong>.</li>
                  <li>Buat akun pengguna di tab <strong>Users</strong> atau daftar via form Admin.</li>
                </ol>
                <div className="pt-1">
                  <a
                    href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
                  >
                    Buka Konfigurasi Sign-in Method Firebase Console
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ) : (
            error && (
              <div
                id="login-error-alert"
                className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2.5 shadow-xs"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username / Email */}
            <div>
              <label
                htmlFor="identifier"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Username atau Email
              </label>
              <input
                id="identifier"
                type="text"
                required
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Masukkan username atau email"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-xs transition disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Password with Show/Hide Toggle */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi akun"
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-xs transition disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Masuk Button */}
            <button
              id="btn-login-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 inline-flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:opacity-60 transition shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi akun via Firebase Auth...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="mt-6 text-center text-xs text-slate-400">
          AKSARA &copy; {new Date().getFullYear()} &bull; Sistem Informasi Manajemen Akademik dan Administrasi Sekolah
        </p>
      </div>
    </div>
  );
};
