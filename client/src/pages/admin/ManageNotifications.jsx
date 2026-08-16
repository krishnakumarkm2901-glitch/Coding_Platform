import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Bell, 
  Send, 
  Trash2, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  AlertCircle,
  Megaphone,
  Clock,
  User,
  ShieldAlert
} from 'lucide-react';
import { PageLoader } from '../../components/common/Loader';

export const ManageNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Announcement Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications);
      }
    } catch (err) {
      setError('Failed to load notifications feed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendAnnouncement = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setFormLoading(true);

    try {
      const res = await api.post('/admin/notifications', {
        title,
        message,
        type
      });

      if (res.data.success) {
        setFormSuccess('Announcement broadcasted successfully!');
        setTitle('');
        setMessage('');
        setType('info');
        // Refresh notifications
        fetchNotifications();
      }
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to send announcement.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const res = await api.delete(`/admin/notifications/${id}`);
      if (res.data.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      alert('Failed to delete announcement.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) {
    return <PageLoader text="Loading system notifications..." />;
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033] dark:text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-[#0757B8] dark:text-[#60A5FA]" />
            System Notifications
          </h1>
          <p className="text-sm text-[#667085] dark:text-[#94A3B8] mt-1">
            Broadcast announcements to students and monitor system security alerts
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Create Announcement Form */}
        <div className="p-6 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm h-fit">
          <h3 className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#0757B8] dark:text-[#60A5FA]" />
            New Announcement
          </h3>

          {formSuccess && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-500/30 text-green-500 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{formSuccess}</span>
            </div>
          )}

          {formError && (
            <div className="mb-4 p-3 bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSendAnnouncement} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#667085] dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">
                Announcement Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-xs font-semibold text-[#172033] dark:text-[#F8FAFC] placeholder-[#8491A5] focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition shadow-sm"
                placeholder="Enter title (e.g. Server Maintenance)"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#667085] dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">
                Announcement Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-xs font-bold text-[#172033] dark:text-[#F8FAFC] focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition shadow-sm"
              >
                <option value="info">Information (Blue)</option>
                <option value="success">Important Alert (Green)</option>
                <option value="warning">System Warning (Yellow)</option>
                <option value="danger">Urgent Notice (Red)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#667085] dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">
                Message Body *
              </label>
              <textarea
                required
                rows="4"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-xs font-semibold text-[#172033] dark:text-[#F8FAFC] placeholder-[#8491A5] focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition shadow-sm resize-none"
                placeholder="Type your message to broadcast..."
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={formLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{formLoading ? 'Broadcasting...' : 'Send Announcement'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Unified Activity & Announcement Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-sm">
            <h3 className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#0757B8] dark:text-[#60A5FA]" />
              Notifications Feed
            </h3>

            {notifications.length === 0 ? (
              <div className="text-center py-12 text-[#667085] dark:text-[#94A3B8] text-xs">
                No recent notifications or announcements.
              </div>
            ) : (
              <div className="space-y-3.5">
                {notifications.map((notif) => {
                  const isAnn = notif.target === 'announcement';
                  return (
                    <div 
                      key={notif.id}
                      className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                        notif.type === 'danger'
                          ? 'bg-[#EF4444]/5 border-[#EF4444]/20'
                          : notif.type === 'warning'
                          ? 'bg-amber-500/5 border-amber-500/20'
                          : notif.type === 'success'
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : 'bg-blue-500/5 border-blue-500/20'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${
                        notif.type === 'danger'
                          ? 'bg-[#EF4444]/10 text-[#EF4444]'
                          : notif.type === 'warning'
                          ? 'bg-amber-500/10 text-amber-600'
                          : notif.type === 'success'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-blue-500/10 text-blue-600'
                      }`}>
                        {notif.target === 'violation' ? (
                          <ShieldAlert className="w-4 h-4" />
                        ) : notif.type === 'danger' ? (
                          <AlertCircle className="w-4 h-4" />
                        ) : notif.type === 'warning' ? (
                          <AlertTriangle className="w-4 h-4" />
                        ) : notif.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Info className="w-4 h-4" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <h4 className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC] truncate">
                            {notif.title}
                          </h4>
                          
                          {/* Date and actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-[#667085] dark:text-[#94A3B8] font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(notif.created_at)}
                            </span>
                            
                            {isAnn && (
                              <button
                                onClick={() => handleDeleteAnnouncement(notif.id)}
                                className="p-1 hover:bg-red-500/10 text-red-500 rounded-lg transition"
                                title="Delete Announcement"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-[#667085] dark:text-[#94A3B8] leading-relaxed break-words whitespace-pre-wrap">
                          {notif.message}
                        </p>

                        <div className="text-[10px] font-semibold text-[#8491A5] flex items-center gap-1.5 pt-1">
                          <User className="w-3 h-3 text-[#8491A5]" />
                          <span>By {notif.created_by}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
