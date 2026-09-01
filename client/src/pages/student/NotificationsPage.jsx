import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { 
  Bell, 
  Trophy, 
  Code2, 
  History, 
  Award, 
  Sparkles, 
  Calendar, 
  ShieldAlert, 
  Settings, 
  Trash2, 
  CheckCheck,
  Check,
  Clock,
  Inbox,
  Megaphone,
  Send,
  AlertCircle,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { PageLoader } from '../../components/common/Loader';

const NOTIF_ICONS = {
  contest: Trophy,
  coding_problem: Code2,
  submission: History,
  leaderboard: Award,
  achievement: Sparkles,
  daily_challenge: Calendar,
  attendance: Calendar,
  'anti-cheat': ShieldAlert,
  anti_cheat: ShieldAlert,
  system: Settings
};

const NOTIF_COLORS = {
  contest: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  coding_problem: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  submission: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  leaderboard: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  achievement: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  daily_challenge: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  attendance: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'anti-cheat': 'bg-red-500/10 text-red-600 border-red-500/20',
  anti_cheat: 'bg-red-500/10 text-red-600 border-red-500/20',
  system: 'bg-slate-500/10 text-slate-600 border-slate-500/20'
};

export const NotificationsPage = () => {
  const { isAdmin } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [globalSuccessMsg, setGlobalSuccessMsg] = useState('');

  // Bulk selection & delete states
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteModalType, setDeleteModalType] = useState('selected'); // 'single' | 'selected' | 'all'
  const [targetSingleId, setTargetSingleId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Announcement modal state
  const [isAnnModalOpen, setIsAnnModalOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annType, setAnnType] = useState('info');
  const [annLoading, setAnnLoading] = useState(false);
  const [annSuccess, setAnnSuccess] = useState('');
  const [annError, setAnnError] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unread_count);
      }
    } catch (err) {
      setError('Failed to fetch notifications.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await api.put('/notifications/mark-read');
      if (res.data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
        setGlobalSuccessMsg('All notifications marked as read.');
        setTimeout(() => setGlobalSuccessMsg(''), 3000);
      }
    } catch (err) {
      alert('Failed to mark all notifications as read.');
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const res = await api.put(`/notifications/${id}/read`);
      if (res.data.success) {
        setNotifications((prev) => 
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------- SELECTION HANDLERS -----------------
  const allVisibleSelected = notifications.length > 0 && notifications.every((n) => selectedIds.includes(n.id));

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map((n) => n.id));
    }
  };

  // ----------------- DELETE MODAL HANDLERS -----------------
  const handleOpenDeleteSingle = (e, id) => {
    e.stopPropagation();
    setTargetSingleId(id);
    setDeleteModalType('single');
    setIsDeleteModalOpen(true);
  };

  const handleOpenDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setDeleteModalType('selected');
    setIsDeleteModalOpen(true);
  };

  const handleOpenDeleteAll = () => {
    if (notifications.length === 0) return;
    setDeleteModalType('all');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleteLoading(true);

      if (deleteModalType === 'single') {
        const notifToDelete = notifications.find((n) => n.id === targetSingleId);
        const res = await api.delete(`/notifications/${targetSingleId}`);
        if (res.data.success) {
          setNotifications((prev) => prev.filter((n) => n.id !== targetSingleId));
          setSelectedIds((prev) => prev.filter((id) => id !== targetSingleId));
          if (notifToDelete && !notifToDelete.is_read) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
          setGlobalSuccessMsg('Notification deleted successfully.');
        }
      } else if (deleteModalType === 'selected') {
        const count = selectedIds.length;
        const res = await api.post('/notifications/bulk-delete', { ids: selectedIds });
        if (res.data.success) {
          const unreadDeleted = notifications.filter((n) => selectedIds.includes(n.id) && !n.is_read).length;
          setNotifications((prev) => prev.filter((n) => !selectedIds.includes(n.id)));
          setUnreadCount((prev) => Math.max(0, prev - unreadDeleted));
          setSelectedIds([]);
          setGlobalSuccessMsg(`${count} notification${count > 1 ? 's' : ''} deleted successfully.`);
        }
      } else if (deleteModalType === 'all') {
        const res = await api.post('/notifications/delete-all');
        if (res.data.success) {
          setNotifications([]);
          setSelectedIds([]);
          setUnreadCount(0);
          setGlobalSuccessMsg('All notifications deleted successfully.');
        }
      }

      setIsDeleteModalOpen(false);
      setTimeout(() => setGlobalSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete notifications.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBroadcastAnnouncement = async (e) => {
    e.preventDefault();
    setAnnError('');
    setAnnSuccess('');
    setAnnLoading(true);

    try {
      const res = await api.post('/admin/notifications', {
        title: annTitle,
        message: annMessage,
        type: annType
      });

      if (res.data.success) {
        setAnnSuccess('Announcement broadcasted successfully!');
        setAnnTitle('');
        setAnnMessage('');
        setAnnType('info');
        // Close modal after 1.5s
        setTimeout(() => {
          setIsAnnModalOpen(false);
          setAnnSuccess('');
        }, 1500);
        // Refresh feed
        fetchNotifications();
      }
    } catch (err) {
      setAnnError(err.response?.data?.error || 'Failed to send announcement.');
    } finally {
      setAnnLoading(false);
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
    return <PageLoader text="Loading notifications..." />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Header Area */}
      <div className="flex items-start justify-between border-b border-[#D9E0E8] dark:border-[#30363D] pb-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-[#172033] dark:text-[#F8FAFC] tracking-tight flex items-center gap-3">
            <Bell className="w-8 h-8 text-[#0757B8] dark:text-[#60A5FA]" />
            Notifications
          </h1>
          <p className="text-sm font-semibold text-blue-500">
            {unreadCount === 0 ? 'No unread notifications' : `${unreadCount} unread`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => setIsAnnModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 border border-[#0757B8]/20 bg-[#0757B8] hover:bg-[#0757B8]/95 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-500/10"
            >
              <Megaphone className="w-4 h-4" />
              <span>Broadcast Announcement</span>
            </button>
          )}

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-4 py-2 border border-blue-200 dark:border-blue-900/50 hover:bg-[#EEF6FF] dark:hover:bg-[#0B1E36] hover:text-[#0757B8] text-[#172033] dark:text-[#F8FAFC] font-bold text-xs rounded-xl transition shadow-sm bg-white dark:bg-[#151A21]"
            >
              <CheckCheck className="w-4 h-4 text-blue-500" />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {globalSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-[#22B573]/15 border border-[#22B573]/30 text-[#22B573] text-xs flex items-center gap-2 font-bold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{globalSuccessMsg}</span>
        </div>
      )}

      {/* Action / Toolbar Bar with Select All, Delete Selected, Delete All */}
      <div className="p-3.5 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-white dark:bg-[#151A21] flex items-center justify-between gap-3 shadow-sm flex-wrap">
        {/* Select All Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer select-none px-2 py-1 rounded-xl hover:bg-[#F5F7FA] dark:hover:bg-[#20252C] transition">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={handleSelectAll}
            disabled={notifications.length === 0}
            className="w-4 h-4 rounded text-[#0757B8] border-[#D9E0E8] dark:border-[#30363D] focus:ring-[#0757B8] cursor-pointer disabled:opacity-40"
          />
          <span className="text-xs font-bold text-[#667085] dark:text-[#94A3B8]">
            Select All
          </span>
        </label>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Delete Selected Button */}
          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={handleOpenDeleteSelected}
            className="px-3.5 py-2 rounded-2xl bg-[#EF4444] hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>
              {selectedIds.length > 0 ? `Delete Selected (${selectedIds.length})` : 'Delete Selected'}
            </span>
          </button>

          {/* Delete All Button */}
          <button
            type="button"
            disabled={notifications.length === 0}
            onClick={handleOpenDeleteAll}
            className="px-3.5 py-2 rounded-2xl bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/30 text-[#EF4444] font-bold text-xs shadow-sm flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete All</span>
          </button>
        </div>

        {/* Available Count */}
        <span className="text-xs font-bold text-[#0757B8] dark:text-[#60A5FA] whitespace-nowrap px-1">
          {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'}
        </span>
      </div>

      {/* Notifications Cards Stack */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#8491A5] dark:text-[#94A3B8] border border-[#D9E0E8] dark:border-[#30363D] rounded-3xl bg-white dark:bg-[#151A21] space-y-3">
          <Inbox className="w-12 h-12 text-[#8491A5] opacity-50" />
          <p className="text-sm font-semibold">Your inbox is clean!</p>
          <p className="text-xs">No recent notifications received.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif) => {
            const Icon = NOTIF_ICONS[notif.type] || Bell;
            const colorClass = NOTIF_COLORS[notif.type] || 'bg-slate-500/10 text-slate-600 border-slate-500/20';
            const isSelected = selectedIds.includes(notif.id);
            
            return (
              <div
                key={notif.id}
                onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                className={`p-5 rounded-3xl border bg-white dark:bg-[#151A21] transition shadow-sm hover:shadow-md cursor-pointer relative flex items-start gap-3.5 ${
                  isSelected ? 'ring-2 ring-[#0757B8] bg-blue-50/20 dark:bg-blue-950/10' : ''
                } ${
                  notif.is_read
                    ? 'border-[#E2E8F0] dark:border-[#30363D]'
                    : 'border-l-4 border-l-[#0757B8] border-y-[#E2E8F0] border-r-[#E2E8F0] dark:border-y-[#30363D] dark:border-r-[#30363D]'
                }`}
              >
                {/* Individual Checkbox */}
                <div 
                  className="pt-2.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelect(notif.id)}
                    className="w-4 h-4 rounded text-[#0757B8] border-[#D9E0E8] dark:border-[#30363D] focus:ring-[#0757B8] cursor-pointer"
                  />
                </div>

                {/* Notification Icon */}
                <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center border ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC]">
                      {notif.title}
                    </h4>

                    {/* Unread dot / status */}
                    {!notif.is_read && (
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" title="Unread" />
                    )}
                  </div>

                  <p className="text-xs text-[#667085] dark:text-[#94A3B8] leading-relaxed break-words whitespace-pre-wrap">
                    {notif.message}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <Clock className="w-3.5 h-3.5 text-[#8491A5]" />
                    <span className="text-[10px] text-[#8491A5] font-semibold">{formatDate(notif.created_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 self-center">
                  {!notif.is_read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notif.id);
                      }}
                      className="p-2 hover:bg-green-500/10 text-green-500 rounded-xl transition"
                      title="Mark as Read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleOpenDeleteSingle(e, notif.id)}
                    className="p-2 hover:bg-red-500/10 text-red-500 rounded-xl transition"
                    title="Delete Notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Broadcast Announcement Modal */}
      {isAnnModalOpen && (
        <Modal
          isOpen={isAnnModalOpen}
          onClose={() => setIsAnnModalOpen(false)}
          title="Broadcast Global Announcement"
        >
          <form onSubmit={handleBroadcastAnnouncement} className="space-y-4">
            {annSuccess && (
              <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-500/30 text-green-500 text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{annSuccess}</span>
              </div>
            )}

            {annError && (
              <div className="p-3 bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{annError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#667085] dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">
                Announcement Title *
              </label>
              <input
                type="text"
                required
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-xs font-semibold text-[#172033] dark:text-[#F8FAFC] placeholder-[#8491A5] focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition shadow-sm"
                placeholder="e.g. Server Maintenance Scheduled"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#667085] dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">
                Announcement Type *
              </label>
              <select
                value={annType}
                onChange={(e) => setAnnType(e.target.value)}
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
                value={annMessage}
                onChange={(e) => setAnnMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FFFFFF] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-xs font-semibold text-[#172033] dark:text-[#F8FAFC] placeholder-[#8491A5] focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC] transition shadow-sm resize-none"
                placeholder="Broadcast text message here..."
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={annLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{annLoading ? 'Broadcasting...' : 'Broadcast Announcement'}</span>
            </button>
          </form>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !deleteLoading && setIsDeleteModalOpen(false)}
        title="Confirm Delete"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-[#EF4444]">
                {deleteModalType === 'all'
                  ? 'Delete All Notifications?'
                  : deleteModalType === 'selected'
                  ? `Are you sure you want to delete ${selectedIds.length} selected notification${selectedIds.length > 1 ? 's' : ''}?`
                  : 'Are you sure you want to delete this notification?'}
              </p>
              <p className="text-[#667085] dark:text-[#94A3B8]">
                This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={deleteLoading}
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#667085] dark:text-[#94A3B8] font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={handleConfirmDelete}
              className="px-5 py-2 rounded-xl bg-[#EF4444] hover:bg-red-700 text-white font-bold shadow-md shadow-red-500/20 disabled:opacity-50 flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{deleteLoading ? 'Deleting...' : 'Delete'}</span>
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
