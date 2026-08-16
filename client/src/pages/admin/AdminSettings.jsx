import React, { useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Settings, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Sliders, 
  Server
} from 'lucide-react';

export const AdminSettings = () => {
  const { user } = useAuth();
  
  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' });
  const [pwdLoading, setPwdLoading] = useState(false);

  // Platform preferences state
  const [platformName, setPlatformName] = useState('NIT_Campus_Coder');
  const [supportEmail, setSupportEmail] = useState('admin@college.edu');
  const [strictMode, setStrictMode] = useState(true);
  const [prefMsg, setPrefMsg] = useState('');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdMsg({ type: '', text: '' });

    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setPwdMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    try {
      setPwdLoading(true);
      const res = await api.post('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      });

      if (res.data.success) {
        setPwdMsg({ type: 'success', text: 'Admin password updated successfully!' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setPwdMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to update password.',
      });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleSavePreferences = (e) => {
    e.preventDefault();
    setPrefMsg('Preferences saved locally (Simulation)');
    setTimeout(() => setPrefMsg(''), 3000);
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#172033] dark:text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-[#0757B8] dark:text-[#60A5FA]" />
          Admin Settings
        </h1>
        <p className="text-sm text-[#667085] dark:text-[#94A3B8] mt-1">
          Configure platform behaviors and manage security credentials
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Info Column */}
        <div className="p-6 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] flex flex-col shadow-sm">
          <h3 className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Server className="w-4 h-4 text-[#0757B8] dark:text-[#60A5FA]" />
            System Info
          </h3>
          <div className="space-y-3.5 text-xs text-[#667085] dark:text-[#94A3B8]">
            <div>
              <span className="font-semibold block text-[#172033] dark:text-[#F8FAFC]">Role:</span>
              <span className="font-mono">Administrator</span>
            </div>
            <div>
              <span className="font-semibold block text-[#172033] dark:text-[#F8FAFC]">Database Status:</span>
              <span className="text-green-500 font-bold flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Online (MongoDB)
              </span>
            </div>
            <div>
              <span className="font-semibold block text-[#172033] dark:text-[#F8FAFC]">API Endpoint:</span>
              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">/api/v1</span>
            </div>
          </div>
        </div>

        {/* Right Configuration Column */}
        <div className="md:col-span-2 space-y-6">
          {/* Change Password Form */}
          <div className="p-6 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm">
            <h3 className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC] uppercase tracking-wider mb-4 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#0757B8] dark:text-[#60A5FA]" />
              Change Password
            </h3>

            {pwdMsg.text && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                  pwdMsg.type === 'success'
                    ? 'bg-[#22B573]/15 border border-[#22B573]/30 text-[#22B573] font-bold'
                    : 'bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] font-bold'
                }`}
              >
                {pwdMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{pwdMsg.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#667085] dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-xs font-semibold text-[#172033] dark:text-[#F8FAFC] placeholder-[#8491A5] focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition shadow-sm"
                  placeholder="Enter current password"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#667085] dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-xs font-semibold text-[#172033] dark:text-[#F8FAFC] placeholder-[#8491A5] focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition shadow-sm"
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#667085] dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-xs font-semibold text-[#172033] dark:text-[#F8FAFC] placeholder-[#8491A5] focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition shadow-sm"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={pwdLoading}
                className="px-5 py-2.5 rounded-xl bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition disabled:opacity-50"
              >
                {pwdLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Platform Preferences Form */}
          <div className="p-6 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm">
            <h3 className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#0757B8] dark:text-[#60A5FA]" />
              Platform Preferences
            </h3>

            {prefMsg && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-500/30 text-green-500 text-xs font-bold rounded-xl">
                {prefMsg}
              </div>
            )}

            <form onSubmit={handleSavePreferences} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#667085] dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">
                  Platform Name
                </label>
                <input
                  type="text"
                  required
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-xs font-semibold text-[#172033] dark:text-[#F8FAFC] placeholder-[#8491A5] focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#667085] dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">
                  Support Email
                </label>
                <input
                  type="email"
                  required
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-xs font-semibold text-[#172033] dark:text-[#F8FAFC] placeholder-[#8491A5] focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition shadow-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="strictMode"
                  checked={strictMode}
                  onChange={(e) => setStrictMode(e.target.checked)}
                  className="rounded border-[#D9E0E8] dark:border-[#30363D] text-[#0757B8] focus:ring-[#0757B8] cursor-pointer"
                />
                <label htmlFor="strictMode" className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC] cursor-pointer select-none">
                  Enable Strict Contest Anti-Cheat Mode by Default
                </label>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition"
              >
                Save Preferences
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
