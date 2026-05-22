import { useState } from 'react';
import { signInWithGoogle } from '../firebase';

interface LoginScreenProps {
  onLogin: () => void;
  onGuest: () => void;
}

export default function LoginScreen({ onLogin, onGuest }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      onLogin(); // This will be handled by the auth state listener
    } catch (err) {
      setError('Failed to sign in with Google. Please try again.');
      console.error('Google sign-in error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = () => {
    onGuest();
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md space-y-6 p-8">
        {/* Logo/Brand */}
        <div className="text-center">
          <div className="w-16 h-16 bg-stone-900 rounded-xl flex items-center justify-center mb-4">
            <span className="text-white text-2xl">💰</span>
          </div>
          <h1 className="font-bold text-2xl text-stone-900">FinanceTracker</h1>
          <p className="text-sm text-stone-500">
            Track your income and expenses with ease
          </p>
        </div>

        {/* Google Sign-In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-5 py-3 text-lg font-medium rounded-xl transition-all hover:bg-stone-800 bg-stone-900 text-white"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span className="mr-2">🔵</span>
              <span>Masuk dengan Google</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center text-stone-400">
          <div className="flex-1 border-t border-stone-200"></div>
          <span className="px-2 text-sm">Atau</span>
          <div className="flex-1 border-t border-stone-200"></div>
        </div>

        {/* Guest Mode Button */}
        <button
          onClick={handleGuestMode}
          className="w-full flex items-center justify-center gap-3 px-5 py-3 text-lg font-medium rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition-colors"
        >
          <span className="mr-2">👤</span>
          <span>Mode Tamu</span>
        </button>

        {/* Error Message */}
        {error && (
          <p className="text-xs text-rose-500 bg-rose-50 rounded-xl px-4 py-2 text-center">
            {error}
          </p>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-stone-400">
          <p>
            Data disimpan secara lokal saat menggunakan Mode Tamu
          </p>
          <p>
            Login dengan Google untuk menyimpan data secara aman di cloud
          </p>
        </div>
      </div>
    </div>
  );
}