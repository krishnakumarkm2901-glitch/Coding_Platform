import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  User, 
  Mail, 
  Building2, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound,
  ShieldCheck,
  Edit3,
  Trophy,
  Sparkles,
  Upload,
} from 'lucide-react';
import { PageLoader } from '../../components/common/Loader';
import { Modal } from '../../components/common/Modal';

export const ProfilePage = () => {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit Profile form states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editYear, setEditYear] = useState('3rd Year');
  const [editAvatar, setEditAvatar] = useState('');
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' });
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/students/profile');
      if (res.data.success) {
        setProfile(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditModal = () => {
    const stu = profile?.student || user;
    setEditName(stu?.name || '');
    setEditEmail(stu?.email || '');
    setEditDepartment(stu?.department || '');
    setEditYear(stu?.year || '3rd Year');
    setEditAvatar(stu?.avatar || '');
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setEditError("Image size must be less than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result); // Base64 string
      };
      reader.onerror = () => {
        setEditError("Failed to read the file.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditProfileSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditLoading(true);

    try {
      const res = await api.put('/students/profile', {
        name: editName,
        email: editEmail,
        department: editDepartment,
        year: editYear,
        avatar: editAvatar,
      });

      if (res.data.success) {
        const updatedStu = res.data.student;
        setProfile((prev) => ({
          ...prev,
          student: updatedStu,
        }));
        setUser((currentUser) => {
          const merged = { ...currentUser, ...updatedStu };
          localStorage.setItem('user', JSON.stringify(merged));
          return merged;
        });
        setIsEditModalOpen(false);
      }
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setEditLoading(false);
    }
  };

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
        setPwdMsg({ type: 'success', text: 'Password updated successfully!' });
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

  if (loading) {
    return <PageLoader text="Loading student profile details..." />;
  }

  const stu = profile?.student || user;
  const stats = profile?.stats || {};

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#172033] dark:text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
          <User className="w-6 h-6 text-[#0757B8] dark:text-[#60A5FA]" />
          Student Profile
        </h1>
        <p className="text-sm text-[#667085] dark:text-[#94A3B8] mt-1">
          Manage your account information and security credentials
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Profile Card */}
        <div className="p-6 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] flex flex-col items-center text-center shadow-sm">
          <div className="relative group mb-4">
            {stu?.avatar ? (
              <img
                src={stu.avatar}
                alt={stu?.name}
                className="w-24 h-24 rounded-full object-cover border-2 border-[#0757B8] dark:border-[#0066CC] shadow-md"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[#0757B8] dark:bg-[#0066CC] text-white font-extrabold text-3xl flex items-center justify-center shadow-md">
                {stu?.name ? stu.name[0].toUpperCase() : 'S'}
              </div>
            )}
            
            {/* Pencil Overlay */}
            <button 
              onClick={handleOpenEditModal}
              className="absolute bottom-0 right-0 p-1.5 bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] hover:border-[#0757B8]/40 text-[#0757B8] dark:text-[#60A5FA] rounded-full shadow-md transition hover:scale-105"
              title="Change Profile Details"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>

          <h2 className="text-lg font-bold text-[#172033] dark:text-[#F8FAFC]">{stu?.name}</h2>
          <span className="text-xs font-mono text-[#0757B8] dark:text-[#60A5FA] font-bold bg-[#DDF2FF] dark:bg-[#142A43] px-3 py-1 rounded-full border border-[#0757B8]/20 dark:border-[#0066CC]/40 mt-1.5">
            {stu?.student_id}
          </span>

          <div className="w-full mt-6 pt-6 border-t border-[#D9E0E8] dark:border-[#30363D] space-y-3 text-left text-xs">
            <div className="flex items-center gap-2.5 text-[#667085] dark:text-[#94A3B8]">
              <Mail className="w-4 h-4 text-[#667085] dark:text-[#94A3B8] shrink-0" />
              <span className="truncate">{stu?.email}</span>
            </div>
            <div className="flex items-center gap-2.5 text-[#667085] dark:text-[#94A3B8]">
              <Building2 className="w-4 h-4 text-[#667085] dark:text-[#94A3B8] shrink-0" />
              <span className="truncate">{stu?.department}</span>
            </div>
            <div className="flex items-center gap-2.5 text-[#667085] dark:text-[#94A3B8]">
              <GraduationCap className="w-4 h-4 text-[#667085] dark:text-[#94A3B8] shrink-0" />
              <span>{stu?.year}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenEditModal}
            className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2 bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] hover:border-[#0757B8]/40 hover:text-[#0757B8] dark:hover:text-[#60A5FA] text-[#172033] dark:text-[#F8FAFC] font-bold text-xs rounded-xl transition shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* Right Column: Coding Summary + Password Security */}
        <div className="md:col-span-2 space-y-6">
          {/* Quick Stat Highlights */}
          <div className="p-6 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm">
            <h3 className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC] uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#22B573]" />
              Academic Performance Summary
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              {/* Problems Solved */}
              <div className="p-5 rounded-3xl bg-[#EAF9F1] dark:bg-[#11241B] border border-[#22B573]/20 dark:border-[#22B573]/30 flex flex-col items-center justify-center shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#22B573]/15 text-[#22B573] flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="text-[11px] uppercase font-bold text-[#667085] dark:text-[#94A3B8]">Problems Solved</div>
                <div className="text-2xl font-extrabold text-[#22B573] font-mono mt-1">
                  {stats.solved_problems || 0}
                </div>
              </div>

              {/* Contest Points */}
              <div className="p-5 rounded-3xl bg-[#EEF6FF] dark:bg-[#122033] border border-[#0757B8]/20 dark:border-[#0066CC]/30 flex flex-col items-center justify-center shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#0757B8]/15 text-[#0757B8] dark:text-[#60A5FA] flex items-center justify-center mb-3">
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="text-[11px] uppercase font-bold text-[#667085] dark:text-[#94A3B8]">Contest Points</div>
                <div className="text-2xl font-extrabold text-[#0757B8] dark:text-[#60A5FA] font-mono mt-1">
                  {stats.contest_score || 0}
                </div>
              </div>

              {/* Current Streak */}
              <div className="p-5 rounded-3xl bg-[#FFF5F5] dark:bg-[#2A1616] border border-red-500/20 dark:border-red-500/30 flex flex-col items-center justify-center shadow-sm">
                <div className="w-10 h-10 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="text-[11px] uppercase font-bold text-[#667085] dark:text-[#94A3B8]">Current Streak</div>
                <div className="text-2xl font-extrabold text-red-500 font-mono mt-1">
                  {stats.current_streak || 0}
                </div>
              </div>
            </div>
          </div>

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
        </div>

      </div>

      {/* ================= EDIT PROFILE MODAL ================= */}
      {isEditModalOpen && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Profile Details"
        >
          <form onSubmit={handleEditProfileSubmit} className="space-y-4">
            {editError && (
              <div className="p-3 bg-[#EF4444]/15 border border-[#EF4444]/30 rounded-xl text-xs font-bold text-[#EF4444] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {/* Profile Picture Upload Section */}
            <div>
              <label className="block text-xs font-bold text-[#667085] dark:text-[#94A3B8] mb-2 uppercase tracking-wide">
                Profile Picture
              </label>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D]">
                {editAvatar ? (
                  <img
                    src={editAvatar}
                    alt="Preview"
                    className="w-16 h-16 rounded-full object-cover border border-[#D9E0E8] dark:border-[#30363D]"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#0757B8] dark:bg-[#0066CC] text-white font-extrabold text-xl flex items-center justify-center">
                    {editName ? editName[0].toUpperCase() : 'S'}
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <label className="flex items-center justify-center gap-2 px-3.5 py-2 border border-[#D9E0E8] dark:border-[#30363D] hover:border-[#0757B8]/40 hover:text-[#0757B8] dark:hover:text-[#60A5FA] text-[#172033] dark:text-[#F8FAFC] font-bold text-xs rounded-xl cursor-pointer bg-[#FFFFFF] dark:bg-[#151A21] transition shadow-sm w-fit">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image File</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                  </label>
                  <p className="text-[10px] text-[#667085] dark:text-[#94A3B8]">Supports JPG, PNG (Max 2MB)</p>
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-[#667085] dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-xs font-semibold text-[#172033] dark:text-[#F8FAFC] placeholder-[#8491A5] focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition shadow-sm"
                placeholder="Enter full name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-[#667085] dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-xs font-semibold text-[#172033] dark:text-[#F8FAFC] placeholder-[#8491A5] focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition shadow-sm"
                placeholder="Enter email address"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-bold text-[#667085] dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">
                Department *
              </label>
              <input
                type="text"
                required
                value={editDepartment}
                onChange={(e) => setEditDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-xs font-semibold text-[#172033] dark:text-[#F8FAFC] placeholder-[#8491A5] focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition shadow-sm"
                placeholder="Computer Science & Engg"
              />
            </div>

            {/* Year */}
            <div>
              <label className="block text-xs font-bold text-[#667085] dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">
                Academic Year *
              </label>
              <select
                value={editYear}
                onChange={(e) => setEditYear(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-xs font-bold text-[#172033] dark:text-[#F8FAFC] focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition shadow-sm"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#D9E0E8] dark:border-[#30363D]">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 border border-[#D9E0E8] dark:border-[#30363D] hover:bg-[#F5F7FA] dark:hover:bg-[#151A21] rounded-xl text-xs font-bold text-[#667085] dark:text-[#94A3B8] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className="px-4 py-2 rounded-xl bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition disabled:opacity-50"
              >
                {editLoading ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
