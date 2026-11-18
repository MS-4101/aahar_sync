import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, LogIn, AlertCircle, Utensils, ShieldCheck, KeyRound, Building2 } from 'lucide-react';
import { loginUser } from '../services/api';

export const LoginModal = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter your Restaurant Owner mobile number and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await loginUser(username, password);
      onSuccess(res.user);
    } catch (err) {
      setError(err.message || 'Login failed. Verify mobile and password in AaharIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="w-full max-w-sm neu-raised border border-slate-200/90 p-7 sm:p-8 rounded-3xl shadow-2xl space-y-6 bg-white"
      >
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30 ring-4 ring-blue-50">
            <Utensils className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Restaurant Owner Login</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Access live floor & revenue dashboard using your AaharIN owner credentials
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
              Owner Mobile Number
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. 9685513722"
                className="w-full neu-inset rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
              AaharIN Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full neu-inset rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-medium"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-extrabold text-xs shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-50 tracking-wider uppercase transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Authenticating...' : 'Secure Owner Sign In'}</span>
          </motion.button>
        </form>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span className="flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>AaharIN POS Sync</span>
          </span>
          <span className="flex items-center gap-1 text-emerald-600 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>256-Bit SSL</span>
          </span>
        </div>
      </motion.div>
    </div>
  );
};
