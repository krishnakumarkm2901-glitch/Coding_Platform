import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { 
  Trophy, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Clock, 
  Users, 
  AlertCircle, 
  AlertTriangle,
  CheckCircle2, 
  ShieldAlert,
  Code2,
  HelpCircle,
  Sparkles,
  Search,
  Check,
  X,
  PlusCircle,
  FileSpreadsheet,
  Upload,
  Download,
  Share2,
  Copy,
  Lock,
  Unlock
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { PageLoader } from '../../components/common/Loader';
import { formatISTDateTime as formatDateTime, toISTDateTimeInput } from '../../utils/date';

const formatAnnouncementDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = String(d.getFullYear()).slice(-2);
  
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  
  let suffix = 'th';
  if (day === 1 || day === 21 || day === 31) suffix = 'st';
  else if (day === 2 || day === 22) suffix = 'nd';
  else if (day === 3 || day === 23) suffix = 'rd';
  
  return `${day}${suffix} ${month}'${year} ${hours}:${minutes} ${ampm}`;
};

const generateAnnouncementText = (contest, role) => {
  if (!contest) return '';
  const contestName = contest.title || '';
  
  const startDate = new Date(contest.start_time);
  const today = new Date();
  const isToday = startDate.getDate() === today.getDate() &&
                  startDate.getMonth() === today.getMonth() &&
                  startDate.getFullYear() === today.getFullYear();
                  
  const timeContext = isToday ? 'today' : `on ${formatAnnouncementDate(contest.start_time)}`;
  
  const formattedStart = formatAnnouncementDate(contest.start_time);
  const formattedEnd = formatAnnouncementDate(contest.end_time);
  
  const durationMin = contest.duration_minutes || 60;
  let durationStr = `${durationMin} mins`;
  if (durationMin >= 1440) {
    const days = Math.round(durationMin / 1440);
    durationStr = `${days} day${days > 1 ? 's' : ''} (${durationMin} mins)`;
  } else if (durationMin >= 60) {
    const hours = Math.floor(durationMin / 60);
    const mins = durationMin % 60;
    durationStr = `${hours} hour${hours > 1 ? 's' : ''}${mins > 0 ? ` ${mins} mins` : ''} (${durationMin} mins)`;
  }

  const probCount = contest.problem_ids?.length ?? contest.problems_count ?? 0;
  const mcqCount = contest.mcq_ids?.length ?? contest.mcqs_count ?? 0;
  const totalQuestions = probCount + mcqCount;
  
  const contestUrl = `${window.location.origin}/contests/${contest.id}`;

  return `📢 ${contestName}
Dear Students,

We are excited to inform you about the ${contestName} happening ${timeContext}.

📅 Date: ${formattedStart} - ${formattedEnd}
⏰ Duration: ${durationStr}
❓ Total Questions: ${totalQuestions}

About the Contest:
${contest.description || 'No description provided.'}

This assessment is designed for the ${role || 'Software Engineer'} role and evaluates the fundamental concepts commonly tested in placement interviews.

🔗 Contest Link: ${contestUrl}

All interested students are encouraged to participate and make the most of this opportunity.

Wishing you all the best! 🚀`;
};

export const ManageContests = () => {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lazy-loaded Question & Problem Bank states (Empty on modal open)
  const [availableProblems, setAvailableProblems] = useState([]);
  const [availableMCQs, setAvailableMCQs] = useState([]);
  const [selectedProblems, setSelectedProblems] = useState([]);
  const [selectedMCQs, setSelectedMCQs] = useState([]);
  const [checkedProblemIds, setCheckedProblemIds] = useState([]);
  const [checkedMcqIds, setCheckedMcqIds] = useState([]);
  const [browserSelectedMcqIds, setBrowserSelectedMcqIds] = useState([]);
  const [browserSelectedProblemIds, setBrowserSelectedProblemIds] = useState([]);
  const [isBrowserMcqDeleteModalOpen, setIsBrowserMcqDeleteModalOpen] = useState(false);
  const [isBrowserProblemDeleteModalOpen, setIsBrowserProblemDeleteModalOpen] = useState(false);
  const [browserDeleteLoading, setBrowserDeleteLoading] = useState(false);
  const [browserNotification, setBrowserNotification] = useState({ type: '', message: '' });

  const [isBrowsingProblems, setIsBrowsingProblems] = useState(false);
  const [isBrowsingMCQs, setIsBrowsingMCQs] = useState(false);
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [loadingMCQs, setLoadingMCQs] = useState(false);
  const [problemsLoaded, setProblemsLoaded] = useState(false);
  const [mcqsLoaded, setMcqsLoaded] = useState(false);
  const [problemError, setProblemError] = useState('');
  const [mcqError, setMcqError] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Search inside problem/MCQ selectors
  const [problemSearch, setProblemSearch] = useState('');
  const [mcqSearch, setMcqSearch] = useState('');

  // Participants & Anti-cheat audit modal
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  const [selectedContestParticipants, setSelectedContestParticipants] = useState([]);
  const [selectedContestTitle, setSelectedContestTitle] = useState('');
  const [participantsLoading, setParticipantsLoading] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');

  // Sharing announcement states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharingContest, setSharingContest] = useState(null);
  const [sharingRole, setSharingRole] = useState('Software Development Engineer (SDE)');
  const [sharingMessage, setSharingMessage] = useState('');
  const [shareSuccess, setShareSuccess] = useState(false);

  const handleOpenShareModal = (contest) => {
    setSharingContest(contest);
    const roleDefault = 'Software Development Engineer (SDE)';
    setSharingRole(roleDefault);
    const msg = generateAnnouncementText(contest, roleDefault);
    setSharingMessage(msg);
    setShareSuccess(false);
    setIsShareModalOpen(true);
  };

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setSharingRole(newRole);
    if (sharingContest) {
      setSharingMessage(generateAnnouncementText(sharingContest, newRole));
    }
  };

  const handleCopyAnnouncement = async () => {
    try {
      await navigator.clipboard.writeText(sharingMessage);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleWhatsAppShare = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(sharingMessage)}`;
    window.open(url, '_blank');
  };

  const handleSystemShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: sharingContest?.title || 'Contest Announcement',
          text: sharingMessage
        });
      } catch (err) {
        console.error('System share cancelled or failed:', err);
      }
    }
  };

  // Excel MCQ Import States
  const [isImportMCQModalOpen, setIsImportMCQModalOpen] = useState(false);
  const [importMCQFile, setImportMCQFile] = useState(null);
  const [importMCQLoading, setImportMCQLoading] = useState(false);
  const [importMCQCommitLoading, setImportMCQCommitLoading] = useState(false);
  const [importMCQPreviewData, setImportMCQPreviewData] = useState(null);
  const [importMCQErrorMsg, setImportMCQErrorMsg] = useState('');
  const mcqFileInputRef = useRef(null);

  // Create Coding Problem inside contest states
  const [isCreateProblemModalOpen, setIsCreateProblemModalOpen] = useState(false);
  const [problemActionLoading, setProblemActionLoading] = useState(false);
  const [problemErrorMsg, setProblemErrorMsg] = useState('');
  const [problemFormData, setProblemFormData] = useState({
    title: '',
    difficulty: 'Easy',
    topic: 'Arrays',
    description: '',
    input_format: '',
    output_format: '',
    constraints: '',
    sample_input: '',
    sample_output: '',
    time_limit: 2.0,
    memory_limit: 256,
    test_cases: [
      { input: '', expected_output: '', is_sample: true, explanation: '' }
    ],
    starter_code: {
      python: 'def solve():\n    # Write your solution here\n    pass\n',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n',
      c: '#include <stdio.h>\n\nint main() {\n    return 0;\n}\n',
      java: 'import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}\n',
      javascript: 'function solve() {\n    // Solution\n}\n',
    }
  });

  // Create MCQ inside contest states
  const [isCreateMCQModalOpen, setIsCreateMCQModalOpen] = useState(false);
  const [mcqActionLoading, setMcqActionLoading] = useState(false);
  const [mcqErrorMsg, setMcqErrorMsg] = useState('');
  const [mcqFormData, setMcqFormData] = useState({
    question: '',
    topic: 'C Programming',
    difficulty: 'Easy',
    options: ['', '', '', ''],
    correct_answer: '',
    explanation: '',
  });

  const availableTopics = [
    'Arrays', 'Strings', 'Linked Lists', 'Trees', 'Graphs',
    'Dynamic Programming', 'Recursion', 'Searching & Sorting', 'Math', 'Stack & Queue'
  ];

  const mcqTopics = [
    'C Programming', 'C++ & OOP', 'Java', 'Python', 'Data Structures',
    'Database Management Systems', 'Operating Systems', 'Computer Networks',
    'Software Engineering', 'Aptitude & Logical Reasoning'
  ];

  const handleOpenCreateProblemModal = () => {
    setProblemFormData({
      title: '',
      difficulty: 'Easy',
      topic: 'Arrays',
      description: '',
      input_format: '',
      output_format: '',
      constraints: '',
      sample_input: '',
      sample_output: '',
      time_limit: 2.0,
      memory_limit: 256,
      test_cases: [
        { input: '', expected_output: '', is_sample: true, explanation: '' }
      ],
      starter_code: {
        python: 'def solve():\n    # Write your solution here\n    pass\n',
        cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n',
        c: '#include <stdio.h>\n\nint main() {\n    return 0;\n}\n',
        java: 'import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}\n',
        javascript: 'function solve() {\n    // Solution\n}\n',
      }
    });
    setProblemErrorMsg('');
    setIsCreateProblemModalOpen(true);
  };

  const handleOpenCreateMCQModal = () => {
    setMcqFormData({
      question: '',
      topic: 'C Programming',
      difficulty: 'Easy',
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: '',
    });
    setMcqErrorMsg('');
    setIsCreateMCQModalOpen(true);
  };

  const handleProblemAddTestCase = () => {
    setProblemFormData((prev) => ({
      ...prev,
      test_cases: [...prev.test_cases, { input: '', expected_output: '', is_sample: false, explanation: '' }]
    }));
  };

  const handleProblemRemoveTestCase = (index) => {
    setProblemFormData((prev) => ({
      ...prev,
      test_cases: prev.test_cases.filter((_, idx) => idx !== index)
    }));
  };

  const handleProblemTestCaseChange = (index, field, value) => {
    setProblemFormData((prev) => {
      const updated = [...prev.test_cases];
      updated[index][field] = value;
      return { ...prev, test_cases: updated };
    });
  };

  const handleMCQOptionChange = (index, value) => {
    setMcqFormData((prev) => {
      const updated = [...prev.options];
      updated[index] = value;
      return { ...prev, options: updated };
    });
  };

  const handleCreateProblemSubmit = async (e) => {
    e.preventDefault();
    if (!problemFormData.title.trim()) {
      setProblemErrorMsg('Problem title is required.');
      return;
    }
    if (!problemFormData.description.trim()) {
      setProblemErrorMsg('Problem description is required.');
      return;
    }

    try {
      setProblemActionLoading(true);
      setProblemErrorMsg('');

      const res = await api.post('/admin/problems', problemFormData);
      if (res.data.success) {
        const newProblemId = String(res.data.id || res.data.problem?.id || res.data.problem?._id);
        const newProblemObj = res.data.problem || {
          id: newProblemId,
          _id: newProblemId,
          title: problemFormData.title,
          topic: problemFormData.topic,
          difficulty: problemFormData.difficulty,
        };

        // Add to selected problems and form data directly (no full bank fetch)
        setSelectedProblems((prev) => [...prev.filter(p => String(p.id || p._id) !== newProblemId), newProblemObj]);
        setFormData((prev) => ({
          ...prev,
          problem_ids: [...new Set([...prev.problem_ids, newProblemId])]
        }));

        // If available bank is cached, append to available list as well
        if (problemsLoaded) {
          setAvailableProblems((prev) => [...prev.filter(p => String(p.id || p._id) !== newProblemId), newProblemObj]);
        }

        setSuccessMsg('Coding problem created and assigned successfully!');
        setIsCreateProblemModalOpen(false);
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      setProblemErrorMsg(err.response?.data?.error || 'Failed to create coding problem.');
    } finally {
      setProblemActionLoading(false);
    }
  };

  const handleCreateMCQSubmit = async (e) => {
    e.preventDefault();
    if (!mcqFormData.question.trim()) {
      setMcqErrorMsg('Question text is required.');
      return;
    }
    if (mcqFormData.options.some(opt => !opt.trim())) {
      setMcqErrorMsg('All 4 options are required.');
      return;
    }
    if (!mcqFormData.correct_answer) {
      setMcqErrorMsg('Please select the correct answer.');
      return;
    }

    try {
      setMcqActionLoading(true);
      setMcqErrorMsg('');

      const res = await api.post('/admin/mcqs', mcqFormData);
      if (res.data.success) {
        const newMCQId = String(res.data.id || res.data.mcq?.id || res.data.mcq?._id);
        const newMCQObj = res.data.mcq || {
          id: newMCQId,
          _id: newMCQId,
          question: mcqFormData.question,
          topic: mcqFormData.topic,
          difficulty: mcqFormData.difficulty,
          options: mcqFormData.options,
          correct_answer: mcqFormData.correct_answer,
        };

        // Add to selected MCQs and form data directly (no full bank fetch)
        setSelectedMCQs((prev) => [...prev.filter(m => String(m.id || m._id) !== newMCQId), newMCQObj]);
        setFormData((prev) => ({
          ...prev,
          mcq_ids: [...new Set([...prev.mcq_ids, newMCQId])]
        }));

        // If available bank is cached, append to available list as well
        if (mcqsLoaded) {
          setAvailableMCQs((prev) => [...prev.filter(m => String(m.id || m._id) !== newMCQId), newMCQObj]);
        }

        setSuccessMsg('MCQ created and assigned successfully!');
        setIsCreateMCQModalOpen(false);
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      setMcqErrorMsg(err.response?.data?.error || 'Failed to create MCQ.');
    } finally {
      setMcqActionLoading(false);
    }
  };

  // ----------------- EXCEL MCQ IMPORT HANDLERS -----------------

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/admin/mcqs/import/template', {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'MCQ_Import_Template.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download template:', err);
      alert('Failed to download template. Please try again.');
    }
  };

  const handleOpenImportMCQModal = () => {
    setImportMCQFile(null);
    setImportMCQPreviewData(null);
    setImportMCQErrorMsg('');
    setIsImportMCQModalOpen(true);
    if (mcqFileInputRef.current) mcqFileInputRef.current.value = '';
  };

  const handleMCQFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportMCQFile(file);
    setImportMCQErrorMsg('');
    setImportMCQPreviewData(null);

    const formDataPayload = new FormData();
    formDataPayload.append('file', file);

    try {
      setImportMCQLoading(true);
      const res = await api.post('/admin/mcqs/import/preview', formDataPayload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setImportMCQPreviewData(res.data);
      }
    } catch (err) {
      setImportMCQErrorMsg(err.response?.data?.error || 'Failed to parse Excel file. Please verify format.');
    } finally {
      setImportMCQLoading(false);
    }
  };

  const handleCommitImportMCQ = async () => {
    if (!importMCQPreviewData || !importMCQPreviewData.valid_rows?.length) return;

    try {
      setImportMCQCommitLoading(true);
      setImportMCQErrorMsg('');

      const res = await api.post('/admin/mcqs/import/commit', {
        mcqs: importMCQPreviewData.valid_rows
      });

      if (res.data.success) {
        const importedIds = res.data.imported_ids || [];
        const importedItems = (importMCQPreviewData.valid_rows || []).map((row, idx) => ({
          id: String(importedIds[idx] || `imported-${idx}-${Date.now()}`),
          _id: String(importedIds[idx] || `imported-${idx}-${Date.now()}`),
          question: row.question,
          topic: row.topic || 'CS',
          difficulty: row.difficulty || 'Easy',
          options: row.options || [],
          correct_answer: row.options?.[row.correctOption - 1] || ''
        }));

        // Assign imported MCQs directly to selected MCQs and contest form data without loading global bank
        setSelectedMCQs((prev) => {
          const existingIds = new Set(prev.map(m => String(m.id || m._id)));
          const newItems = importedItems.filter(m => !existingIds.has(String(m.id || m._id)));
          return [...prev, ...newItems];
        });

        setFormData((prev) => ({
          ...prev,
          mcq_ids: Array.from(new Set([...prev.mcq_ids, ...importedIds.map(String)]))
        }));

        setIsImportMCQModalOpen(false);
        setSuccessMsg(`Successfully imported and assigned ${res.data.imported_count || importedIds.length} MCQs!`);
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      setImportMCQErrorMsg(err.response?.data?.error || 'Failed to save MCQs.');
    } finally {
      setImportMCQCommitLoading(false);
    }
  };

  const [hasCoding, setHasCoding] = useState(true);
  const [hasMCQ, setHasMCQ] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration_minutes: 60,
    mcqs_per_student: 20,
    start_time: '',
    end_time: '',
    is_published: true,
    problem_ids: [],
    mcq_ids: [],
    allow_calculator: false,
  });

  useEffect(() => {
    fetchInitialData();
    // Lightweight polling every 6 seconds for live status updates
    const pollInterval = setInterval(() => {
      fetchContestsOnly();
    }, 6000);
    return () => clearInterval(pollInterval);
  }, []);

  // Fetch ONLY contests on page mount — NO automatic loading of entire question/problem banks!
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const cRes = await api.get('/admin/contests');
      if (cRes.data.success) setContests(cRes.data.contests || []);
    } catch (err) {
      console.error('Failed to load admin contests:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchContestsOnly = async () => {
    try {
      const res = await api.get('/admin/contests');
      if (res.data.success) {
        setContests(res.data.contests || []);
      }
    } catch (err) {
      // Quiet fail during background poll
    }
  };

  // Lazy loaders for browsing existing Question / Problem banks
  const handleBrowseProblems = async () => {
    if (isBrowsingProblems) {
      setIsBrowsingProblems(false);
      return;
    }
    setIsBrowsingProblems(true);
    if (!problemsLoaded) {
      try {
        setLoadingProblems(true);
        setProblemError('');
        const res = await api.get('/admin/problems', { params: { limit: 200 } });
        if (res.data.success) {
          setAvailableProblems(res.data.problems || []);
          setProblemsLoaded(true);
        }
      } catch (err) {
        setProblemError('Unable to load coding problems. Please try again.');
      } finally {
        setLoadingProblems(false);
      }
    }
  };

  const handleBrowseMCQs = async () => {
    if (isBrowsingMCQs) {
      setIsBrowsingMCQs(false);
      return;
    }
    setIsBrowsingMCQs(true);
    if (!mcqsLoaded) {
      try {
        setLoadingMCQs(true);
        setMcqError('');
        const res = await api.get('/admin/mcqs', { params: { limit: 500 } });
        if (res.data.success) {
          setAvailableMCQs(res.data.mcqs || []);
          setMcqsLoaded(true);
        }
      } catch (err) {
        setMcqError('Unable to load questions. Please try again.');
      } finally {
        setLoadingMCQs(false);
      }
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setProblemSearch('');
    setMcqSearch('');
    setIsBrowsingProblems(false);
    setIsBrowsingMCQs(false);
    setSelectedProblems([]);
    setSelectedMCQs([]);
    setHasCoding(true);
    setHasMCQ(true);
    const now = new Date();
    const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    setFormData({
      title: '',
      description: '',
      duration_minutes: 60,
      mcqs_per_student: 20,
      start_time: toISTDateTimeInput(now),
      end_time: toISTDateTimeInput(future),
      is_published: true,
      problem_ids: [],
      mcq_ids: [],
      allow_calculator: false,
    });
    setCheckedMcqIds([]);
    setCheckedProblemIds([]);
    setBrowserSelectedMcqIds([]);
    setBrowserSelectedProblemIds([]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contest) => {
    setEditingId(contest.id);
    setProblemSearch('');
    setMcqSearch('');
    setIsBrowsingProblems(false);
    setIsBrowsingMCQs(false);
    const probIds = (contest.problem_ids || contest.codingProblemIds || []).map(id => String(id));
    const mcqIds = (contest.mcq_ids || contest.mcqIds || []).map(id => String(id));

    // Load only assigned question objects without fetching entire 500+ bank
    const contestProbs = (contest.problems || []).map(p => ({
      id: String(p.id || p._id),
      _id: String(p.id || p._id),
      title: p.title || `Problem #${p.id || p._id}`,
      topic: p.topic || 'General',
      difficulty: p.difficulty || 'Easy'
    }));
    const contestMCQs = (contest.mcqs || []).map(m => ({
      id: String(m.id || m._id),
      _id: String(m.id || m._id),
      question: m.question || `MCQ #${m.id || m._id}`,
      topic: m.topic || 'CS',
      difficulty: m.difficulty || 'Easy'
    }));

    setSelectedProblems(
      contestProbs.length > 0
        ? contestProbs
        : probIds.map(id => ({ id, _id: id, title: `Problem #${id}`, topic: 'Assigned', difficulty: 'Medium' }))
    );
    setSelectedMCQs(
      contestMCQs.length > 0
        ? contestMCQs
        : mcqIds.map(id => ({ id, _id: id, question: `MCQ #${id}`, topic: 'Assigned' }))
    );

    const cType = contest.contestType || contest.contest_type;
    if (cType === 'CODING') {
      setHasCoding(true);
      setHasMCQ(false);
    } else if (cType === 'MCQ') {
      setHasCoding(false);
      setHasMCQ(true);
    } else if (cType === 'BOTH') {
      setHasCoding(true);
      setHasMCQ(true);
    } else {
      setHasCoding(probIds.length > 0 || mcqIds.length === 0);
      setHasMCQ(mcqIds.length > 0 || probIds.length === 0);
    }

    setFormData({
      title: contest.title || '',
      description: contest.description || '',
      duration_minutes: contest.duration_minutes || 60,
      mcqs_per_student: contest.mcqs_per_student || 20,
      start_time: toISTDateTimeInput(contest.start_time),
      end_time: toISTDateTimeInput(contest.end_time),
      is_published: Boolean(contest.is_published),
      problem_ids: probIds,
      mcq_ids: mcqIds,
      allow_calculator: Boolean(contest.allow_calculator || contest.allowCalculator),
    });
    setCheckedMcqIds([]);
    setCheckedProblemIds([]);
    setBrowserSelectedMcqIds([]);
    setBrowserSelectedProblemIds([]);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleToggleProblemSelect = (problem) => {
    const idStr = String(problem.id || problem._id || problem);
    setFormData((prev) => {
      const exists = prev.problem_ids.includes(idStr);
      return {
        ...prev,
        problem_ids: exists
          ? prev.problem_ids.filter((id) => id !== idStr)
          : [...prev.problem_ids, idStr],
      };
    });

    setSelectedProblems((prev) => {
      const exists = prev.some((p) => String(p.id || p._id) === idStr);
      if (exists) {
        return prev.filter((p) => String(p.id || p._id) !== idStr);
      } else {
        const fullObj = typeof problem === 'object'
          ? problem
          : availableProblems.find(p => String(p.id || p._id) === idStr) || { id: idStr, _id: idStr, title: `Problem #${idStr}` };
        return [...prev, fullObj];
      }
    });
  };

  const handleToggleMCQSelect = (mcq) => {
    const idStr = String(mcq.id || mcq._id || mcq);
    setFormData((prev) => {
      const exists = prev.mcq_ids.includes(idStr);
      return {
        ...prev,
        mcq_ids: exists
          ? prev.mcq_ids.filter((id) => id !== idStr)
          : [...prev.mcq_ids, idStr],
      };
    });

    setSelectedMCQs((prev) => {
      const exists = prev.some((m) => String(m.id || m._id) === idStr);
      if (exists) {
        return prev.filter((m) => String(m.id || m._id) !== idStr);
      } else {
        const fullObj = typeof mcq === 'object'
          ? mcq
          : availableMCQs.find(m => String(m.id || m._id) === idStr) || { id: idStr, _id: idStr, question: `MCQ #${idStr}` };
        return [...prev, fullObj];
      }
    });
  };

  const handleDeleteSingleProblem = (pId) => {
    const idStr = String(pId);
    setFormData((prev) => ({
      ...prev,
      problem_ids: prev.problem_ids.filter((id) => id !== idStr)
    }));
    setSelectedProblems((prev) => prev.filter((p) => String(p.id || p._id) !== idStr));
    setCheckedProblemIds((prev) => prev.filter((id) => id !== idStr));
  };

  const handleDeleteSelectedProblems = () => {
    if (checkedProblemIds.length === 0) return;
    setFormData((prev) => ({
      ...prev,
      problem_ids: prev.problem_ids.filter((id) => !checkedProblemIds.includes(id))
    }));
    setSelectedProblems((prev) => prev.filter((p) => !checkedProblemIds.includes(String(p.id || p._id))));
    setCheckedProblemIds([]);
  };

  const handleDeleteSingleMCQ = (mId) => {
    const idStr = String(mId);
    setFormData((prev) => ({
      ...prev,
      mcq_ids: prev.mcq_ids.filter((id) => id !== idStr)
    }));
    setSelectedMCQs((prev) => prev.filter((m) => String(m.id || m._id) !== idStr));
    setCheckedMcqIds((prev) => prev.filter((id) => id !== idStr));
  };

  const handleDeleteSelectedMCQs = () => {
    if (checkedMcqIds.length === 0) return;
    setFormData((prev) => ({
      ...prev,
      mcq_ids: prev.mcq_ids.filter((id) => !checkedMcqIds.includes(id))
    }));
    setSelectedMCQs((prev) => prev.filter((m) => !checkedMcqIds.includes(String(m.id || m._id))));
    setCheckedMcqIds([]);
  };

  // Browser Bulk Deletion Handlers
  const handleConfirmBrowserDeleteMCQs = async () => {
    if (browserSelectedMcqIds.length === 0) return;
    try {
      setBrowserDeleteLoading(true);
      const count = browserSelectedMcqIds.length;
      const res = await api.post('/admin/mcqs/bulk-delete', { ids: browserSelectedMcqIds });
      if (res.data.success) {
        setAvailableMCQs(prev => prev.filter(m => !browserSelectedMcqIds.includes(String(m.id || m._id))));
        setSelectedMCQs(prev => prev.filter(m => !browserSelectedMcqIds.includes(String(m.id || m._id))));
        setFormData(prev => ({
          ...prev,
          mcq_ids: prev.mcq_ids.filter(id => !browserSelectedMcqIds.includes(id))
        }));
        setBrowserSelectedMcqIds([]);
        setIsBrowserMcqDeleteModalOpen(false);
        setBrowserNotification({ type: 'success', message: `${count} question${count > 1 ? 's' : ''} deleted successfully.` });
        setTimeout(() => setBrowserNotification({ type: '', message: '' }), 4000);
      }
    } catch (err) {
      setBrowserNotification({ type: 'error', message: err.response?.data?.error || 'Failed to delete questions.' });
      setTimeout(() => setBrowserNotification({ type: '', message: '' }), 4000);
    } finally {
      setBrowserDeleteLoading(false);
    }
  };

  const handleConfirmBrowserDeleteProblems = async () => {
    if (browserSelectedProblemIds.length === 0) return;
    try {
      setBrowserDeleteLoading(true);
      const count = browserSelectedProblemIds.length;
      const res = await api.post('/admin/problems/bulk-delete', { ids: browserSelectedProblemIds });
      if (res.data.success) {
        setAvailableProblems(prev => prev.filter(p => !browserSelectedProblemIds.includes(String(p.id || p._id))));
        setSelectedProblems(prev => prev.filter(p => !browserSelectedProblemIds.includes(String(p.id || p._id))));
        setFormData(prev => ({
          ...prev,
          problem_ids: prev.problem_ids.filter(id => !browserSelectedProblemIds.includes(id))
        }));
        setBrowserSelectedProblemIds([]);
        setIsBrowserProblemDeleteModalOpen(false);
        setBrowserNotification({ type: 'success', message: `${count} question${count > 1 ? 's' : ''} deleted successfully.` });
        setTimeout(() => setBrowserNotification({ type: '', message: '' }), 4000);
      }
    } catch (err) {
      setBrowserNotification({ type: 'error', message: err.response?.data?.error || 'Failed to delete questions.' });
      setTimeout(() => setBrowserNotification({ type: '', message: '' }), 4000);
    } finally {
      setBrowserDeleteLoading(false);
    }
  };

  const handleTogglePublish = async (contest) => {
    try {
      const res = await api.put(`/admin/contests/${contest.id}`, {
        is_published: !contest.is_published,
      });
      if (res.data.success) {
        fetchInitialData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this contest? All candidate submissions and logs will be removed.')) {
      return;
    }
    try {
      const res = await api.delete(`/admin/contests/${id}`);
      if (res.data.success) {
        fetchInitialData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete contest.');
    }
  };

  const handleViewParticipants = async (contest) => {
    setSelectedContestTitle(contest.title);
    setIsParticipantsModalOpen(true);
    try {
      setParticipantsLoading(true);
      const res = await api.get(`/admin/contests/${contest.id}/participants?show_all=true`);
      if (res.data.success) {
        setSelectedContestParticipants(res.data.participants || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleSaveContest = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setErrorMsg('Contest title is required.');
      return;
    }

    if (!hasCoding && !hasMCQ) {
      setErrorMsg('Please select at least one contest type.');
      return;
    }

    if (hasMCQ) {
      const mcqCount = formData.mcq_ids?.length || 0;
      const perStudent = Number(formData.mcqs_per_student || 20);
      if (perStudent <= 0) {
        setErrorMsg('Questions per student must be greater than 0.');
        return;
      }
      if (perStudent > mcqCount) {
        setErrorMsg(`Questions per student (${perStudent}) cannot exceed the configured question count (${mcqCount}).`);
        return;
      }
    }

    const contestType = (hasCoding && hasMCQ) ? 'BOTH' : hasCoding ? 'CODING' : 'MCQ';
    const payload = {
      ...formData,
      contest_type: contestType,
      contestType: contestType,
      problem_ids: hasCoding ? formData.problem_ids : [],
      codingProblemIds: hasCoding ? formData.problem_ids : [],
      mcq_ids: hasMCQ ? formData.mcq_ids : [],
      mcqIds: hasMCQ ? formData.mcq_ids : [],
    };

    try {
      setActionLoading(true);
      setErrorMsg('');

      if (editingId) {
        const res = await api.put(`/admin/contests/${editingId}`, payload);
        if (res.data.success) {
          setIsModalOpen(false);
          fetchInitialData();
        }
      } else {
        const res = await api.post('/admin/contests', payload);
        if (res.data.success) {
          setIsModalOpen(false);
          fetchInitialData();
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to save contest.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered problems & MCQs for lazy browser
  const filteredProblems = availableProblems.filter(p => 
    !problemSearch || 
    p.title?.toLowerCase().includes(problemSearch.toLowerCase()) ||
    p.topic?.toLowerCase().includes(problemSearch.toLowerCase())
  );

  const filteredMCQs = availableMCQs.filter(m => 
    !mcqSearch || 
    m.question?.toLowerCase().includes(mcqSearch.toLowerCase()) ||
    m.topic?.toLowerCase().includes(mcqSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033] dark:text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-[#F2B705]" />
            Manage Contests & Hackathons
          </h1>
          <p className="text-sm text-[#667085] dark:text-[#94A3B8] mt-1">
            Create competitions, assign problems/MCQs, schedule timers, and review integrity logs
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-2xl bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create Contest</span>
        </button>
      </div>

      {/* Contests Grid */}
      {loading ? (
        <PageLoader text="Loading contests management panel..." />
      ) : contests.length === 0 ? (
        <div className="p-16 text-center text-[#667085] dark:text-[#94A3B8] rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C]">
          No contests created yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contests.map((c) => {
            const probCount = c.problem_ids?.length ?? c.problems_count ?? 0;
            const mcqCount = c.mcq_ids?.length ?? c.mcqs_count ?? 0;
            const cType = c.contestType || c.contest_type || (probCount > 0 && mcqCount > 0 ? 'BOTH' : probCount > 0 ? 'CODING' : 'MCQ');

            return (
              <div
                key={c.id}
                className="p-6 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] hover:border-[#0757B8]/40 transition flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleTogglePublish(c)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase transition ${
                          c.is_published
                            ? 'bg-[#22B573]/15 text-[#22B573] border border-[#22B573]/30'
                            : 'bg-slate-200 dark:bg-[#151A21] text-[#667085] dark:text-[#94A3B8]'
                        }`}
                      >
                        {c.is_published ? 'Published' : 'Draft / Unpublished'}
                      </button>

                      {/* Contest Type Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        cType === 'BOTH'
                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                          : cType === 'CODING'
                            ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                            : 'bg-purple-500/15 text-purple-600 border border-purple-500/30'
                      }`}>
                        {cType === 'BOTH' ? 'Coding + MCQ' : cType === 'CODING' ? 'Coding Only' : 'MCQ Only'}
                      </span>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          c.status === 'Active'
                            ? 'bg-[#22B573]/15 text-[#22B573] border border-[#22B573]/30'
                            : c.status === 'Upcoming'
                            ? 'bg-[#DDF2FF] dark:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA] border border-[#0757B8]/20 dark:border-[#0066CC]/40'
                            : 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                        }`}
                      >
                        {c.status || 'Upcoming'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-[#667085] dark:text-[#94A3B8]">
                      <Users className="w-3.5 h-3.5" />
                      <span>{c.participants_count || 0} Candidates</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-[#172033] dark:text-[#F8FAFC] mb-1">{c.title}</h3>
                  <p className="text-xs text-[#667085] dark:text-[#94A3B8] line-clamp-2 mb-3 font-sans">{c.description}</p>

                  <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-xs">
                    <div>
                      <div className="text-[10px] text-[#667085] dark:text-[#94A3B8] uppercase font-bold">Coding</div>
                      <div className="font-bold text-[#0757B8] dark:text-[#60A5FA] font-mono mt-0.5">{probCount} Problems</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#667085] dark:text-[#94A3B8] uppercase font-bold">MCQs</div>
                      <div className="font-bold text-purple-600 dark:text-purple-400 font-mono mt-0.5">{mcqCount} MCQs Assigned & {c.mcqs_per_student || 20} Questions/Student</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#667085] dark:text-[#94A3B8] uppercase font-bold">Duration</div>
                      <div className="font-bold text-[#172033] dark:text-[#F8FAFC] font-mono mt-0.5">{c.duration_minutes} Mins</div>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-[#667085] dark:text-[#94A3B8] space-y-1 font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-500">Start:</span>
                      <strong className="text-[#172033] dark:text-[#F8FAFC]">{formatDateTime(c.start_time)}</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-500">End:</span>
                      <strong className="text-[#172033] dark:text-[#F8FAFC]">{formatDateTime(c.end_time)}</strong>
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between pt-4 border-t border-[#D9E0E8] dark:border-[#30363D]">
                  <button
                    onClick={() => handleViewParticipants(c)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#DDF2FF] dark:bg-[#142A43] hover:bg-[#0757B8] dark:hover:bg-[#0066CC] text-[#0757B8] dark:text-[#60A5FA] hover:text-white border border-[#0757B8]/20 dark:border-[#0066CC]/40 text-xs font-bold transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Audit & Anti-Cheat</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenShareModal(c)}
                      className="p-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] hover:bg-[#EEF6FF] dark:hover:bg-[#0B1E36] text-[#667085] dark:text-[#94A3B8] hover:text-[#0757B8] dark:hover:text-[#60A5FA] transition"
                      title="Share Contest Link"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="p-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] hover:bg-[#DDF2FF] dark:hover:bg-[#142A43] text-[#667085] dark:text-[#94A3B8] hover:text-[#0757B8] dark:hover:text-[#60A5FA] transition"
                      title="Edit Contest"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] hover:bg-[#EF4444]/15 text-[#667085] dark:text-[#94A3B8] hover:text-[#EF4444] transition"
                      title="Delete Contest"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT CONTEST MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Contest Details' : 'Create New Contest'}
        maxWidth="max-w-2xl"
      >
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#22B573]/15 border border-[#22B573]/30 text-[#22B573] text-xs flex items-center gap-2 font-bold animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveContest} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Contest Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Annual Algorithmic Grand Prix 2026"
              className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
            />
          </div>

          <div>
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Description</label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief contest overview, topics covered, and eligibility..."
              className="w-full px-3.5 py-2 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Duration (Mins)</label>
              <input
                type="number"
                min="10"
                max="600"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
              />
            </div>
            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide text-[10px] leading-tight">MCQs / Student</label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.mcqs_per_student || 20}
                onChange={(e) => setFormData({ ...formData, mcqs_per_student: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
              />
            </div>
            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Start Date & Time</label>
              <input
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
              />
            </div>
            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">End Date & Time</label>
              <input
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
              />
            </div>
          </div>

          {/* Contest Type Checkboxes */}
          <div className="p-4 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] space-y-2">
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold uppercase tracking-wide text-[10px]">
              Contest Type * (Select at least one)
            </label>
            <div className="flex items-center gap-8 text-xs font-bold text-[#172033] dark:text-[#F8FAFC]">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasCoding}
                  onChange={(e) => setHasCoding(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0757B8] focus:ring-[#0757B8] dark:bg-[#20252C] dark:border-[#30363D]"
                />
                <div className="flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-[#22B573]" />
                  <span>Coding</span>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasMCQ}
                  onChange={(e) => setHasMCQ(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-600 dark:bg-[#20252C] dark:border-[#30363D]"
                />
                <div className="flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-purple-600" />
                  <span>MCQ</span>
                </div>
              </label>
            </div>
            {!hasCoding && !hasMCQ && (
              <div className="text-[11px] font-bold text-red-500 flex items-center gap-1 pt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Please select at least one contest type.</span>
              </div>
            )}
          </div>

          {/* Coding Problem Selector */}
          {hasCoding && (
            <div className="animate-fadeIn space-y-3">
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <label className="text-[#667085] dark:text-[#94A3B8] font-bold uppercase tracking-wide">
                  ASSIGN CODING PROBLEMS ({formData.problem_ids.length} SELECTED)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenCreateProblemModal}
                    className="px-2.5 py-1 rounded-xl bg-[#22B573] hover:opacity-95 text-white font-bold text-[10px] flex items-center gap-1 border border-[#22B573]/20 shadow-sm transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Create Coding Problem</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBrowseProblems}
                    className={`px-2.5 py-1 rounded-xl font-bold text-[10px] flex items-center gap-1 border shadow-sm transition ${
                      isBrowsingProblems
                        ? 'bg-[#0757B8] text-white border-[#0757B8]'
                        : 'bg-[#FFFFFF] dark:bg-[#20252C] text-[#0757B8] dark:text-[#60A5FA] border-[#D9E0E8] dark:border-[#30363D] hover:bg-[#F5F7FA] dark:hover:bg-[#151A21]'
                    }`}
                  >
                    <Search className="w-3 h-3" />
                    <span>{isBrowsingProblems ? 'Close Problem Browser' : 'Browse Coding Problems'}</span>
                  </button>
                </div>
              </div>

              {/* Currently Selected Coding Problems List (Rendered ONLY if selected) */}
              {formData.problem_ids.length > 0 && (
                <div className="space-y-2 p-3 rounded-2xl bg-[#DDF2FF]/40 dark:bg-[#142A43]/40 border border-[#0757B8]/20">
                  <div className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-[#0757B8] dark:text-[#60A5FA] text-[11px]">
                      <input
                        type="checkbox"
                        checked={
                          selectedProblems.length > 0 &&
                          selectedProblems.every(p => checkedProblemIds.includes(String(p.id || p._id)))
                        }
                        onChange={(e) => {
                          const allSelectedIds = selectedProblems.map(p => String(p.id || p._id));
                          if (e.target.checked) {
                            setCheckedProblemIds(allSelectedIds);
                          } else {
                            setCheckedProblemIds([]);
                          }
                        }}
                        className="rounded text-[#0757B8] focus:ring-[#0757B8] dark:bg-[#20252C] dark:border-[#30363D]"
                      />
                      <span>Assigned Problems in Contest ({formData.problem_ids.length})</span>
                    </label>

                    {checkedProblemIds.length > 0 && (
                      <div className="flex items-center gap-2 animate-fadeIn">
                        <span className="font-bold text-[#0757B8] dark:text-[#60A5FA] text-[11px]">{checkedProblemIds.length} Selected</span>
                        <button
                          type="button"
                          onClick={handleDeleteSelectedProblems}
                          className="px-2 py-0.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] transition shadow-sm"
                        >
                          Delete Selected
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                    {selectedProblems.map((p) => {
                      const pIdStr = String(p.id || p._id);
                      return (
                        <div
                          key={pIdStr}
                          className="p-2.5 rounded-xl border bg-[#FFFFFF] dark:bg-[#20252C] border-[#0757B8]/40 text-[#0757B8] dark:text-[#60A5FA] flex items-center justify-between shadow-sm"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <input
                              type="checkbox"
                              checked={checkedProblemIds.includes(pIdStr)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCheckedProblemIds(prev => [...prev, pIdStr]);
                                } else {
                                  setCheckedProblemIds(prev => prev.filter(id => id !== pIdStr));
                                }
                              }}
                              className="w-3.5 h-3.5 rounded text-[#0757B8] focus:ring-[#0757B8] dark:bg-[#151A21] dark:border-[#30363D] shrink-0"
                            />
                            <div className="truncate">
                              <div className="truncate font-bold text-xs">{p.title || `Problem #${pIdStr}`}</div>
                              <div className="text-[10px] text-[#667085] dark:text-[#94A3B8] font-mono">{p.topic || 'General'}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {p.difficulty && (
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                p.difficulty === 'Easy' ? 'bg-[#22B573]/15 text-[#22B573]' : p.difficulty === 'Medium' ? 'bg-[#F2B705]/15 text-[#F2B705]' : 'bg-[#EF4444]/15 text-[#EF4444]'
                              }`}>
                                {p.difficulty}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteSingleProblem(pIdStr)}
                              title="Remove from contest"
                              className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lazy-Loaded Coding Problem Browser Panel */}
              {isBrowsingProblems && (
                <div className="p-3.5 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] space-y-2.5 animate-fadeIn">
                  {browserNotification.message && (
                    <div className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 animate-fadeIn ${
                      browserNotification.type === 'success'
                        ? 'bg-[#22B573]/15 border-[#22B573]/30 text-[#22B573]'
                        : 'bg-[#EF4444]/15 border-[#EF4444]/30 text-[#EF4444]'
                    }`}>
                      {browserNotification.type === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{browserNotification.message}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 justify-between flex-wrap">
                    {/* Select All Checkbox */}
                    <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-bold text-[#0757B8] dark:text-[#60A5FA] px-1">
                      <input
                        type="checkbox"
                        checked={
                          filteredProblems.length > 0 &&
                          filteredProblems.every((p) => browserSelectedProblemIds.includes(String(p.id || p._id)))
                        }
                        onChange={(e) => {
                          const filteredIds = filteredProblems.map((p) => String(p.id || p._id));
                          if (e.target.checked) {
                            setBrowserSelectedProblemIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
                          } else {
                            setBrowserSelectedProblemIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
                          }
                        }}
                        className="w-3.5 h-3.5 rounded text-[#0757B8] focus:ring-[#0757B8] dark:bg-[#20252C] dark:border-[#30363D] cursor-pointer"
                      />
                      <span>Select All</span>
                    </label>

                    {/* Filter search box */}
                    <div className="relative flex-1 min-w-[180px]">
                      <input
                        type="text"
                        value={problemSearch}
                        onChange={(e) => setProblemSearch(e.target.value)}
                        placeholder="Filter coding problems by title or topic..."
                        className="w-full pl-8 pr-3 py-1.5 bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-xs focus:outline-none focus:border-[#0757B8]"
                      />
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#667085]" />
                    </div>

                    {/* Delete Selected Button */}
                    <button
                      type="button"
                      disabled={browserSelectedProblemIds.length === 0}
                      onClick={() => setIsBrowserProblemDeleteModalOpen(true)}
                      className="px-2.5 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-[11px] flex items-center gap-1.5 transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>
                        {browserSelectedProblemIds.length > 0
                          ? `Delete Selected (${browserSelectedProblemIds.length})`
                          : 'Delete Selected'}
                      </span>
                    </button>

                    {problemsLoaded && (
                      <span className="text-[11px] font-bold text-[#0757B8] dark:text-[#60A5FA] whitespace-nowrap">
                        {availableProblems.length} available
                      </span>
                    )}
                  </div>

                  {loadingProblems ? (
                    <div className="py-8 text-center text-[#667085] dark:text-[#94A3B8] flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#0757B8] border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading coding problems...</span>
                    </div>
                  ) : problemError ? (
                    <div className="py-4 text-center text-red-500 space-y-2">
                      <div>{problemError}</div>
                      <button
                        type="button"
                        onClick={handleBrowseProblems}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-bold"
                      >
                        Retry
                      </button>
                    </div>
                  ) : filteredProblems.length === 0 ? (
                    <div className="py-6 text-center text-[#667085] dark:text-[#94A3B8] text-xs">
                      {problemSearch ? 'No coding problems matched your search.' : 'No coding problems available.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {filteredProblems.map((p) => {
                        const pIdStr = String(p.id || p._id);
                        const isSelected = formData.problem_ids.includes(pIdStr);
                        const isCheckedForDelete = browserSelectedProblemIds.includes(pIdStr);

                        return (
                          <div
                            key={pIdStr}
                            onClick={() => handleToggleProblemSelect(p)}
                            className={`p-2.5 rounded-xl border text-left flex items-center justify-between cursor-pointer transition ${
                              isCheckedForDelete
                                ? 'bg-red-500/10 border-red-500/40 text-[#172033] dark:text-[#F8FAFC]'
                                : isSelected
                                ? 'bg-[#DDF2FF] dark:bg-[#142A43] border-[#0757B8] text-[#0757B8] dark:text-[#60A5FA] font-bold shadow-sm'
                                : 'bg-[#FFFFFF] dark:bg-[#20252C] border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC]'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              <input
                                type="checkbox"
                                checked={isCheckedForDelete}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setBrowserSelectedProblemIds((prev) =>
                                    prev.includes(pIdStr) ? prev.filter((id) => id !== pIdStr) : [...prev, pIdStr]
                                  );
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-3.5 h-3.5 rounded text-[#0757B8] focus:ring-[#0757B8] dark:bg-[#151A21] dark:border-[#30363D] shrink-0 cursor-pointer"
                              />
                              <div className="truncate">
                                <div className="truncate font-semibold">{p.title}</div>
                                <div className="text-[10px] text-[#667085] dark:text-[#94A3B8] font-mono">{p.topic || 'General'}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                p.difficulty === 'Easy' ? 'bg-[#22B573]/15 text-[#22B573]' : p.difficulty === 'Medium' ? 'bg-[#F2B705]/15 text-[#F2B705]' : 'bg-[#EF4444]/15 text-[#EF4444]'
                              }`}>
                                {p.difficulty}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#0757B8] dark:text-[#60A5FA]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Technical MCQ Selector */}
          {hasMCQ && (
            <div className="animate-fadeIn space-y-3">
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                <label className="text-[#667085] dark:text-[#94A3B8] font-bold uppercase tracking-wide">
                  ASSIGN TECHNICAL MCQs ({formData.mcq_ids.length} SELECTED)
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleOpenImportMCQModal}
                    className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 border border-emerald-600/20 shadow-sm transition"
                  >
                    <FileSpreadsheet className="w-3 h-3" />
                    <span>Import from Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenCreateMCQModal}
                    className="px-2.5 py-1 rounded-xl bg-purple-600 hover:opacity-95 text-white font-bold text-[10px] flex items-center gap-1 border border-purple-600/20 shadow-sm transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Create MCQ</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBrowseMCQs}
                    className={`px-2.5 py-1 rounded-xl font-bold text-[10px] flex items-center gap-1 border shadow-sm transition ${
                      isBrowsingMCQs
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-[#FFFFFF] dark:bg-[#20252C] text-purple-600 dark:text-purple-400 border-[#D9E0E8] dark:border-[#30363D] hover:bg-[#F5F7FA] dark:hover:bg-[#151A21]'
                    }`}
                  >
                    <Search className="w-3 h-3" />
                    <span>{isBrowsingMCQs ? 'Close MCQ Browser' : 'Browse Existing MCQs'}</span>
                  </button>
                </div>
              </div>

              {/* Currently Selected MCQs List (Rendered ONLY if selected) */}
              {formData.mcq_ids.length > 0 && (
                <div className="space-y-2 p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-purple-700 dark:text-purple-300">
                      <input
                        type="checkbox"
                        checked={
                          selectedMCQs.length > 0 &&
                          selectedMCQs.every(m => checkedMcqIds.includes(String(m.id || m._id)))
                        }
                        onChange={(e) => {
                          const allSelectedIds = selectedMCQs.map(m => String(m.id || m._id));
                          if (e.target.checked) {
                            setCheckedMcqIds(allSelectedIds);
                          } else {
                            setCheckedMcqIds([]);
                          }
                        }}
                        className="rounded text-purple-600 focus:ring-purple-600 dark:bg-[#20252C] dark:border-[#30363D]"
                      />
                      <span>Assigned MCQs in Contest ({selectedMCQs.length})</span>
                    </label>

                    {checkedMcqIds.length > 0 && (
                      <div className="flex items-center gap-2 animate-fadeIn">
                        <span className="font-bold text-purple-600 dark:text-purple-400 text-[11px]">{checkedMcqIds.length} Selected</span>
                        <button
                          type="button"
                          onClick={handleDeleteSelectedMCQs}
                          className="px-2 py-0.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] transition shadow-sm"
                        >
                          Delete Selected
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {selectedMCQs.map((m) => {
                      const mIdStr = String(m.id || m._id);
                      return (
                        <div
                          key={mIdStr}
                          className="p-2.5 rounded-xl border bg-[#FFFFFF] dark:bg-[#20252C] border-purple-500/30 text-purple-700 dark:text-purple-300 flex items-center justify-between shadow-sm"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <input
                              type="checkbox"
                              checked={checkedMcqIds.includes(mIdStr)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCheckedMcqIds(prev => [...prev, mIdStr]);
                                } else {
                                  setCheckedMcqIds(prev => prev.filter(id => id !== mIdStr));
                                }
                              }}
                              className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-600 dark:bg-[#151A21] dark:border-[#30363D] shrink-0"
                            />
                            <div className="truncate">
                              <div className="truncate font-semibold">{m.question || `MCQ #${mIdStr}`}</div>
                              <div className="text-[10px] text-[#667085] dark:text-[#94A3B8] font-mono">{m.topic || 'CS'}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            title="Remove Question from Contest"
                            onClick={() => handleDeleteSingleMCQ(mIdStr)}
                            className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 transition shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lazy-Loaded MCQ Browser Panel */}
              {isBrowsingMCQs && (
                <div className="p-3.5 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] space-y-2.5 animate-fadeIn">
                  {browserNotification.message && (
                    <div className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 animate-fadeIn ${
                      browserNotification.type === 'success'
                        ? 'bg-[#22B573]/15 border-[#22B573]/30 text-[#22B573]'
                        : 'bg-[#EF4444]/15 border-[#EF4444]/30 text-[#EF4444]'
                    }`}>
                      {browserNotification.type === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{browserNotification.message}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 justify-between flex-wrap">
                    {/* Select All Checkbox */}
                    <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-bold text-purple-700 dark:text-purple-300 px-1">
                      <input
                        type="checkbox"
                        checked={
                          filteredMCQs.length > 0 &&
                          filteredMCQs.every((m) => browserSelectedMcqIds.includes(String(m.id || m._id)))
                        }
                        onChange={(e) => {
                          const filteredIds = filteredMCQs.map((m) => String(m.id || m._id));
                          if (e.target.checked) {
                            setBrowserSelectedMcqIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
                          } else {
                            setBrowserSelectedMcqIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
                          }
                        }}
                        className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-600 dark:bg-[#20252C] dark:border-[#30363D] cursor-pointer"
                      />
                      <span>Select All</span>
                    </label>

                    {/* Filter search box */}
                    <div className="relative flex-1 min-w-[180px]">
                      <input
                        type="text"
                        value={mcqSearch}
                        onChange={(e) => setMcqSearch(e.target.value)}
                        placeholder="Filter MCQs by question or topic..."
                        className="w-full pl-8 pr-3 py-1.5 bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-xs focus:outline-none focus:border-purple-600"
                      />
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#667085]" />
                    </div>

                    {/* Delete Selected Button */}
                    <button
                      type="button"
                      disabled={browserSelectedMcqIds.length === 0}
                      onClick={() => setIsBrowserMcqDeleteModalOpen(true)}
                      className="px-2.5 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-[11px] flex items-center gap-1.5 transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>
                        {browserSelectedMcqIds.length > 0
                          ? `Delete Selected (${browserSelectedMcqIds.length})`
                          : 'Delete Selected'}
                      </span>
                    </button>

                    {mcqsLoaded && (
                      <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                        {availableMCQs.length} available
                      </span>
                    )}
                  </div>

                  {loadingMCQs ? (
                    <div className="py-8 text-center text-[#667085] dark:text-[#94A3B8] flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading MCQs...</span>
                    </div>
                  ) : mcqError ? (
                    <div className="py-4 text-center text-red-500 space-y-2">
                      <div>{mcqError}</div>
                      <button
                        type="button"
                        onClick={handleBrowseMCQs}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-bold"
                      >
                        Retry
                      </button>
                    </div>
                  ) : filteredMCQs.length === 0 ? (
                    <div className="py-6 text-center text-[#667085] dark:text-[#94A3B8] text-xs">
                      {mcqSearch ? 'No MCQs matched your search.' : 'No MCQs available in question bank.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {filteredMCQs.map((m) => {
                        const mIdStr = String(m.id || m._id);
                        const isSelected = formData.mcq_ids.includes(mIdStr);
                        const isCheckedForDelete = browserSelectedMcqIds.includes(mIdStr);

                        return (
                          <div
                            key={mIdStr}
                            onClick={() => handleToggleMCQSelect(m)}
                            className={`p-2.5 rounded-xl border text-left flex items-center justify-between cursor-pointer transition ${
                              isCheckedForDelete
                                ? 'bg-red-500/10 border-red-500/40 text-[#172033] dark:text-[#F8FAFC]'
                                : isSelected
                                ? 'bg-purple-500/15 border-purple-500 text-purple-600 dark:text-purple-400 font-bold shadow-sm'
                                : 'bg-[#FFFFFF] dark:bg-[#20252C] border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC]'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              <input
                                type="checkbox"
                                checked={isCheckedForDelete}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setBrowserSelectedMcqIds((prev) =>
                                    prev.includes(mIdStr) ? prev.filter((id) => id !== mIdStr) : [...prev, mIdStr]
                                  );
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-600 dark:bg-[#151A21] dark:border-[#30363D] shrink-0 cursor-pointer"
                              />
                              <div className="truncate">
                                <div className="truncate font-semibold">{m.question}</div>
                                <div className="text-[10px] text-[#667085] dark:text-[#94A3B8] font-mono">{m.topic || 'CS'}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Published Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-[#172033] dark:text-[#F8FAFC]">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="rounded text-[#0757B8] focus:ring-[#0757B8] dark:bg-[#20252C] dark:border-[#30363D]"
              />
              <span className="font-bold">Publish contest to students immediately</span>
            </label>
          </div>

          {/* Allow Calculator Option */}
          <div className="pt-2 border-t border-[#D9E0E8] dark:border-[#30363D]">
            <label className="flex items-center gap-2 cursor-pointer text-[#172033] dark:text-[#F8FAFC]">
              <input
                type="checkbox"
                checked={formData.allow_calculator}
                onChange={(e) => setFormData({ ...formData, allow_calculator: e.target.checked })}
                className="rounded text-[#0757B8] focus:ring-[#0757B8] dark:bg-[#20252C] dark:border-[#30363D]"
              />
              <span className="font-bold">Allow Calculator (ON / OFF)</span>
            </label>
            <p className="text-[10px] text-[#667085] dark:text-[#94A3B8] ml-6 mt-0.5">
              When enabled, a scientific calculator button is shown to students during the contest.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-xl bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white font-bold shadow-md shadow-blue-500/20"
            >
              {actionLoading ? 'Saving...' : editingId ? 'Save Contest' : 'Create Contest'}
            </button>
          </div>
        </form>
      </Modal>

      {/* PARTICIPANTS & ANTI-CHEAT LOGS MODAL */}
      <Modal
        isOpen={isParticipantsModalOpen}
        onClose={() => setIsParticipantsModalOpen(false)}
        title={`Contest Audit & Anti-Cheat: ${selectedContestTitle}`}
        maxWidth="max-w-5xl"
      >
        {participantsLoading ? (
          <PageLoader text="Loading contestant logs and security records..." />
        ) : selectedContestParticipants.length === 0 ? (
          <div className="py-12 text-center text-[#667085] dark:text-[#94A3B8] text-xs">
            No students have joined this contest yet.
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left font-sans">
              <thead className="bg-[#303442] text-white font-bold uppercase">
                <tr>
                  <th className="py-3.5 px-3">Student</th>
                  <th className="py-3.5 px-3">Dept</th>
                  <th className="py-3.5 px-3 text-center">Attempt</th>
                  <th className="py-3.5 px-3 text-center">Score</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-3 text-center">Flags</th>
                  <th className="py-3.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E0E8] dark:divide-[#30363D]/60 font-sans">
                {selectedContestParticipants.map((p) => {
                  const logs = p.anti_cheat_logs || [];
                  const isLocked = p.is_locked || p.status === 'LOCKED';
                  const isTerm = p.auto_terminated || p.status === 'TERMINATED' || p.status === 'AUTO_TERMINATED';
                  const isRetestReady = p.is_retest_ready || p.status === 'RETEST_READY';
                  const isRetestApproved = p.is_retest_approved || p.status === 'RETEST_APPROVED';
                  const attemptNum = p.attempt_number || 1;

                  return (
                    <tr key={p.id} className="hover:bg-[#F5F7FA] dark:hover:bg-[#151A21]/50">
                      {/* Student Info */}
                      <td className="py-3.5 px-3 font-bold text-[#172033] dark:text-[#F8FAFC]">
                        {p.student_name}
                        <span className="text-[#0757B8] dark:text-[#60A5FA] font-mono text-[11px] ml-1">({p.student_id})</span>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-3 text-[#667085] dark:text-[#94A3B8]">{p.department}</td>

                      {/* Attempt Number */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          attemptNum > 1
                            ? 'bg-[#60A5FA]/15 text-[#60A5FA] border border-[#60A5FA]/30'
                            : 'bg-[#F5F7FA] dark:bg-[#151A21] text-[#667085] dark:text-[#94A3B8] border border-[#D9E0E8] dark:border-[#30363D]'
                        }`}>
                          {attemptNum > 1 ? `Retest #${attemptNum}` : '#1'}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="py-3.5 px-3 text-center font-mono font-extrabold text-[#0757B8] dark:text-[#60A5FA] text-sm">
                        {p.score}
                      </td>

                      {/* Status with full state display */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isTerm
                            ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
                            : isLocked
                              ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30'
                              : isRetestReady
                                ? 'bg-[#60A5FA]/15 text-[#60A5FA] border border-[#60A5FA]/30'
                                : isRetestApproved
                                  ? 'bg-[#14B8A6]/15 text-[#14B8A6] border border-[#14B8A6]/30'
                                  : p.submitted
                                    ? 'bg-[#22B573]/15 text-[#22B573] border border-[#22B573]/30'
                                    : 'bg-[#DDF2FF] dark:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA] border border-[#0757B8]/20'
                        }`}>
                          {isTerm ? (
                            <><ShieldAlert className="w-3 h-3" /> Terminated</>
                          ) : isLocked ? (
                            <><Lock className="w-3 h-3" /> Locked</>
                          ) : isRetestReady ? (
                            <><Sparkles className="w-3 h-3" /> Retest Ready</>
                          ) : isRetestApproved ? (
                            <><CheckCircle2 className="w-3 h-3" /> Approved</>
                          ) : p.submitted ? (
                            <><CheckCircle2 className="w-3 h-3" /> Submitted</>
                          ) : (
                            'In-Progress'
                          )}
                        </span>

                        {/* Lock timeout countdown */}
                        {isLocked && p.lock_timeout_remaining_seconds > 0 && (
                          <div className="text-[10px] text-[#F59E0B] font-semibold mt-1">
                            ⏱ {Math.floor(p.lock_timeout_remaining_seconds / 60)}m {p.lock_timeout_remaining_seconds % 60}s remaining
                          </div>
                        )}
                        {isLocked && p.lock_timeout_remaining_seconds === 0 && (
                          <div className="text-[10px] text-[#EF4444] font-semibold mt-1">Window expired</div>
                        )}

                        {/* Reason details */}
                        {p.termination_reason && isTerm && (
                          <div className="text-[10px] text-[#EF4444] font-semibold mt-1">
                            {p.termination_reason}
                          </div>
                        )}
                        {p.lock_reason && isLocked && (
                          <div className="text-[10px] text-[#F59E0B] font-semibold mt-1">
                            {p.lock_reason}
                          </div>
                        )}
                      </td>

                      {/* Anti-Cheat Flags */}
                      <td className="py-3.5 px-3 text-center">
                        {isTerm || logs.length > 0 ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] font-bold">
                            <ShieldAlert className="w-3.5 h-3.5 text-[#EF4444]" />
                            <span>{logs.length || 1} Flags</span>
                          </div>
                        ) : (
                          <span className="text-[#22B573] text-[11px] font-bold">Clean</span>
                        )}
                      </td>

                      {/* Actions: only authenticated admins can reset terminated attempts */}
                      <td className="py-3.5 px-3 text-right">
                        {isTerm && !p.has_active_retest && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm(`Reset contest for ${p.student_name}? Their terminated attempt will remain in history and a new shuffled attempt will be created.`)) return;
                              try {
                                const contestId = selectedContestParticipants[0]?.id ? 
                                  (selectedContestParticipants.find(pp => pp.id)?.id || '') : '';
                                // Find the contest ID from the participant's context
                                const cId = (() => {
                                  // Use the currently selected contest title to find the contest
                                  const matchingContest = contests.find(c => c.title === selectedContestTitle);
                                  return matchingContest?.id || '';
                                })();
                                if (!cId) {
                                  alert('Could not determine contest ID');
                                  return;
                                }
                                const res = await api.post(`/admin/contests/${cId}/restore/${p.id}`);
                                if (res.data.success) {
                                  alert(`Contest reset for ${p.student_name}. Attempt #${res.data.attempt_number} is ready.`);
                                  // Refresh participants
                                  const refreshRes = await api.get(`/admin/contests/${cId}/participants`);
                                  if (refreshRes.data.success) {
                                    setSelectedContestParticipants(refreshRes.data.participants || []);
                                  }
                                }
                              } catch (err) {
                                console.error('Failed to accept retest:', err);
                                alert(err.response?.data?.error || 'Failed to accept retest');
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#F59E0B]/15 hover:bg-[#F59E0B] text-[#F59E0B] hover:text-white border border-[#F59E0B]/30 text-xs font-bold transition shadow-sm"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                              <span>Reset Contest / Allow Retest</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* SHARE ANNOUNCEMENT MODAL */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Share Contest Announcement"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">
              Target Role / Level
            </label>
            <input
              type="text"
              value={sharingRole}
              onChange={handleRoleChange}
              placeholder="e.g. Software Development Engineer (SDE)"
              className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
            />
          </div>

          <div>
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">
              Announcement Message
            </label>
            <textarea
              rows="12"
              value={sharingMessage}
              onChange={(e) => setSharingMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-mono whitespace-pre-wrap focus:outline-none"
            />
          </div>

          {shareSuccess && (
            <div className="p-2.5 rounded-xl bg-[#22B573]/15 border border-[#22B573]/30 text-[#22B573] font-bold text-center animate-fadeIn">
              Message copied to clipboard successfully! 🚀
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[#D9E0E8] dark:border-[#30363D]">
            <button
              type="button"
              onClick={() => setIsShareModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] font-semibold transition"
            >
              Close
            </button>
            
            <button
              type="button"
              onClick={handleCopyAnnouncement}
              className="px-4 py-2 rounded-xl bg-[#0757B8] hover:bg-[#064A9E] text-white font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Copy className="w-4 h-4" />
              <span>Copy Message</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="px-4 py-2 rounded-xl bg-[#22B573] hover:opacity-95 text-white font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97-1.863-1.868-4.343-2.898-6.977-2.9-5.439 0-9.861 4.37-9.866 9.8-.001 1.762.479 3.483 1.393 5.018l-.999 3.648 3.745-.982zm12.5-5.321c-.328-.163-1.94-.949-2.24-1.058-.298-.11-.517-.163-.733.163-.217.327-.84.11-.733.163.298-.11.517-.163.733-.163-.217.327-.84 1.058-1.028 1.277-.188.217-.377.245-.705.082-1.157-.502-1.958-1.037-2.735-1.9-.208-.245-.208-.245.082-.49.208-.188.406-.406.634-.634.188-.188.245-.327.327-.517.082-.19.04-.378-.02-.517-.06-.137-.517-1.22-.705-1.687-.188-.454-.377-.393-.517-.393H9.98c-.188 0-.486.082-.733.327-.245.245-.949.928-.949 2.261 0 1.332.97 2.616 1.104 2.78 1.104 1.451 2.378 2.628 3.642 3.178.694.301 1.25.393 1.722.327.525-.078 1.94-.783 2.217-1.547.278-.764.278-1.42.196-1.546-.082-.128-.278-.208-.605-.371z"/>
              </svg>
              <span>Share on WhatsApp</span>
            </button>

            {navigator.share && (
              <button
                type="button"
                onClick={handleSystemShare}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                <Share2 className="w-4 h-4" />
                <span>Device Share</span>
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* MANUAL CREATE CODING PROBLEM MODAL */}
      <Modal
        isOpen={isCreateProblemModalOpen}
        onClose={() => setIsCreateProblemModalOpen(false)}
        title="Create Coding Problem"
        maxWidth="max-w-4xl"
      >
        {problemErrorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{problemErrorMsg}</span>
          </div>
        )}

        <form onSubmit={handleCreateProblemSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Problem Title *</label>
              <input
                type="text"
                required
                value={problemFormData.title}
                onChange={(e) => setProblemFormData({ ...problemFormData, title: e.target.value })}
                placeholder="e.g. Reverse Linked List"
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold focus:outline-none focus:border-[#0757B8] dark:focus:border-[#0066CC]"
              />
            </div>

            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Difficulty</label>
              <select
                value={problemFormData.difficulty}
                onChange={(e) => setProblemFormData({ ...problemFormData, difficulty: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Topic</label>
              <select
                value={problemFormData.topic}
                onChange={(e) => setProblemFormData({ ...problemFormData, topic: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
              >
                {availableTopics.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Time Limit (seconds)</label>
              <input
                type="number"
                step="0.5"
                value={problemFormData.time_limit}
                onChange={(e) => setProblemFormData({ ...problemFormData, time_limit: parseFloat(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
              />
            </div>

            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Memory Limit (MB)</label>
              <input
                type="number"
                value={problemFormData.memory_limit}
                onChange={(e) => setProblemFormData({ ...problemFormData, memory_limit: parseInt(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Problem Description *</label>
            <textarea
              required
              rows={4}
              value={problemFormData.description}
              onChange={(e) => setProblemFormData({ ...problemFormData, description: e.target.value })}
              placeholder="Describe problem scenario, requirements..."
              className="w-full p-3.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-sans"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Input Format</label>
              <textarea
                rows={2}
                value={problemFormData.input_format}
                onChange={(e) => setProblemFormData({ ...problemFormData, input_format: e.target.value })}
                placeholder="e.g. First line contains integer N..."
                className="w-full p-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-mono"
              />
            </div>

            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Output Format</label>
              <textarea
                rows={2}
                value={problemFormData.output_format}
                onChange={(e) => setProblemFormData({ ...problemFormData, output_format: e.target.value })}
                placeholder="e.g. Print space-separated integers..."
                className="w-full p-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Constraints</label>
            <textarea
              rows={2}
              value={problemFormData.constraints}
              onChange={(e) => setProblemFormData({ ...problemFormData, constraints: e.target.value })}
              placeholder="1 <= N <= 10^5&#10;-10^9 <= nums[i] <= 10^9"
              className="w-full p-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-mono"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Sample Input</label>
              <textarea
                rows={2}
                value={problemFormData.sample_input}
                onChange={(e) => setProblemFormData({ ...problemFormData, sample_input: e.target.value })}
                className="w-full p-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-mono"
              />
            </div>

            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Sample Output</label>
              <textarea
                rows={2}
                value={problemFormData.sample_output}
                onChange={(e) => setProblemFormData({ ...problemFormData, sample_output: e.target.value })}
                className="w-full p-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-mono"
              />
            </div>
          </div>

          {/* Test Cases Builder */}
          <div className="pt-4 border-t border-[#D9E0E8] dark:border-[#30363D] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-[#172033] dark:text-[#F8FAFC]">Evaluation Test Cases ({problemFormData.test_cases.length})</h4>
              <button
                type="button"
                onClick={handleProblemAddTestCase}
                className="px-2.5 py-1 rounded-lg bg-[#DDF2FF] dark:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA] font-bold text-[11px] flex items-center gap-1 border border-[#0757B8]/20 dark:border-[#0066CC]/40"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add Test Case
              </button>
            </div>

            {problemFormData.test_cases.map((tc, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] space-y-2 relative">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#667085] dark:text-[#94A3B8]">
                  <span>Test Case #{idx + 1}</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[#172033] dark:text-[#F8FAFC]">
                      <input
                        type="checkbox"
                        checked={tc.is_sample || false}
                        onChange={(e) => handleProblemTestCaseChange(idx, 'is_sample', e.target.checked)}
                        className="rounded"
                      />
                      <span>Sample Case</span>
                    </label>
                    {problemFormData.test_cases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleProblemRemoveTestCase(idx)}
                        className="text-[#EF4444] hover:opacity-80"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div>
                    <span className="text-[10px] text-[#667085] dark:text-[#94A3B8] font-sans font-semibold">Input:</span>
                    <textarea
                      rows={2}
                      value={tc.input}
                      onChange={(e) => handleProblemTestCaseChange(idx, 'input', e.target.value)}
                      placeholder="stdin"
                      className="w-full p-2 bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] rounded-lg text-[#172033] dark:text-[#F8FAFC] text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#667085] dark:text-[#94A3B8] font-sans font-semibold">Expected Output:</span>
                    <textarea
                      rows={2}
                      value={tc.expected_output}
                      onChange={(e) => handleProblemTestCaseChange(idx, 'expected_output', e.target.value)}
                      placeholder="expected stdout"
                      className="w-full p-2 bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] rounded-lg text-[#22B573] text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#D9E0E8] dark:border-[#30363D]">
            <button
              type="button"
              onClick={() => setIsCreateProblemModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={problemActionLoading}
              className="px-5 py-2.5 rounded-xl bg-[#22B573] hover:opacity-95 text-white font-bold shadow-md shadow-emerald-500/20"
            >
              {problemActionLoading ? 'Creating...' : 'Create Problem'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MANUAL CREATE MCQ MODAL */}
      <Modal
        isOpen={isCreateMCQModalOpen}
        onClose={() => setIsCreateMCQModalOpen(false)}
        title="Create Technical MCQ"
        maxWidth="max-w-2xl"
      >
        {mcqErrorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{mcqErrorMsg}</span>
          </div>
        )}

        <form onSubmit={handleCreateMCQSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Question Text *</label>
            <textarea
              required
              rows={3}
              value={mcqFormData.question}
              onChange={(e) => setMcqFormData({ ...mcqFormData, question: e.target.value })}
              placeholder="e.g. Which normal form eliminates transitive functional dependencies?"
              className="w-full p-3.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Topic</label>
              <select
                value={mcqFormData.topic}
                onChange={(e) => setMcqFormData({ ...mcqFormData, topic: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
              >
                {mcqTopics.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Difficulty</label>
              <select
                value={mcqFormData.difficulty}
                onChange={(e) => setMcqFormData({ ...mcqFormData, difficulty: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          {/* 4 Options Input */}
          <div className="space-y-2.5">
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold uppercase tracking-wide">4 Options *</label>
            {mcqFormData.options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] flex items-center justify-center font-bold text-[#0757B8] dark:text-[#60A5FA] shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <input
                  type="text"
                  required
                  value={opt}
                  onChange={(e) => handleMCQOptionChange(idx, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                  className="flex-1 px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC] font-semibold"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Select Correct Answer *</label>
            <select
              required
              value={mcqFormData.correct_answer}
              onChange={(e) => setMcqFormData({ ...mcqFormData, correct_answer: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#22B573] font-bold"
            >
              <option value="">-- Select Correct Option --</option>
              {mcqFormData.options.map((opt, idx) => (
                <option key={idx} value={opt}>
                  {String.fromCharCode(65 + idx)}: {opt || `(Empty Option ${String.fromCharCode(65 + idx)})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#667085] dark:text-[#94A3B8] font-bold mb-1 uppercase tracking-wide">Answer Explanation</label>
            <textarea
              rows={2}
              value={mcqFormData.explanation}
              onChange={(e) => setMcqFormData({ ...mcqFormData, explanation: e.target.value })}
              placeholder="Why is this answer correct? (Optional)"
              className="w-full p-3 bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] rounded-xl text-[#172033] dark:text-[#F8FAFC]"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#D9E0E8] dark:border-[#30363D]">
            <button
              type="button"
              onClick={() => setIsCreateMCQModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mcqActionLoading}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:opacity-95 text-white font-bold shadow-md shadow-purple-600/20"
            >
              {mcqActionLoading ? 'Creating...' : 'Create MCQ'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EXCEL IMPORT MCQ MODAL */}
      <Modal
        isOpen={isImportMCQModalOpen}
        onClose={() => setIsImportMCQModalOpen(false)}
        title="Import MCQs from Excel"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-5 text-xs">
          {/* Instructions Box */}
          <div className="p-4 rounded-2xl bg-[#0757B8]/10 border border-[#0757B8]/20 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-[#0757B8] dark:text-[#60A5FA] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-[#0757B8] dark:text-[#60A5FA]">Required Excel Format (.xlsx)</div>
                <p className="text-[#667085] dark:text-[#94A3B8] leading-relaxed">
                  Columns: <code className="font-mono px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 text-purple-600 dark:text-purple-400 font-bold">Question</code>, <code className="font-mono px-1 py-0.5 rounded bg-black/10 dark:bg-white/10">Option 1</code>, <code className="font-mono px-1 py-0.5 rounded bg-black/10 dark:bg-white/10">Option 2</code>, <code className="font-mono px-1 py-0.5 rounded bg-black/10 dark:bg-white/10">Option 3</code>, <code className="font-mono px-1 py-0.5 rounded bg-black/10 dark:bg-white/10">Option 4</code>, and <code className="font-mono px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 text-emerald-600 dark:text-emerald-400 font-bold">Correct Option</code> (1, 2, 3, or 4).
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 rounded-xl bg-[#FFFFFF] dark:bg-[#20252C] hover:bg-[#F5F7FA] dark:hover:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] font-bold text-xs shadow-sm flex items-center gap-1.5 shrink-0 transition"
              title="Download Sample Template"
            >
              <Download className="w-3.5 h-3.5 text-[#0757B8] dark:text-[#60A5FA]" />
              <span>Sample Template</span>
            </button>
          </div>

          {/* File Upload / Selection Area */}
          <div className="p-6 rounded-2xl border-2 border-dashed border-[#D9E0E8] dark:border-[#30363D] bg-[#F5F7FA] dark:bg-[#151A21] flex flex-col items-center justify-center text-center space-y-3">
            <input
              type="file"
              ref={mcqFileInputRef}
              accept=".xlsx,.xls"
              onChange={handleMCQFileSelect}
              className="hidden"
              id="contest-mcq-excel-input"
            />
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <label
                htmlFor="contest-mcq-excel-input"
                className="cursor-pointer px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{importMCQFile ? 'Choose Different File' : 'Select Excel File (.xlsx)'}</span>
              </label>
              {importMCQFile && (
                <div className="mt-2 text-xs font-bold text-[#172033] dark:text-[#F8FAFC]">
                  Selected: <span className="text-[#0757B8] dark:text-[#60A5FA] font-mono">{importMCQFile.name}</span> ({(importMCQFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>
          </div>

          {importMCQErrorMsg && (
            <div className="p-3.5 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{importMCQErrorMsg}</span>
            </div>
          )}

          {importMCQLoading && (
            <div className="p-8 text-center space-y-2">
              <PageLoader text="Reading and validating Excel rows..." />
            </div>
          )}

          {/* PREVIEW & VALIDATION SUMMARY */}
          {importMCQPreviewData && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] text-center">
                  <div className="text-[10px] uppercase font-bold text-[#667085] dark:text-[#94A3B8]">Total Rows</div>
                  <div className="text-xl font-extrabold text-[#172033] dark:text-[#F8FAFC] font-mono mt-0.5">
                    {importMCQPreviewData.total_rows}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-center">
                  <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Valid</div>
                  <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    {importMCQPreviewData.valid_count}
                  </div>
                </div>
                <div className={`p-3.5 rounded-2xl border text-center ${importMCQPreviewData.invalid_count > 0 ? 'border-red-500/30 bg-red-500/10' : 'border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C]'}`}>
                  <div className={`text-[10px] uppercase font-bold ${importMCQPreviewData.invalid_count > 0 ? 'text-[#EF4444]' : 'text-[#667085] dark:text-[#94A3B8]'}`}>
                    Invalid
                  </div>
                  <div className={`text-xl font-extrabold font-mono mt-0.5 ${importMCQPreviewData.invalid_count > 0 ? 'text-[#EF4444]' : 'text-[#172033] dark:text-[#F8FAFC]'}`}>
                    {importMCQPreviewData.invalid_count}
                  </div>
                </div>
              </div>

              {/* Invalid Rows Warning Table */}
              {importMCQPreviewData.errors?.length > 0 && (
                <div className="p-4 rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/10 space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-[#EF4444]">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{importMCQPreviewData.errors.length} Invalid Row(s) Detected (Will NOT be imported):</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {importMCQPreviewData.errors.map((err, eIdx) => (
                      <div key={eIdx} className="p-2 rounded-xl bg-[#FFFFFF] dark:bg-[#151A21] border border-[#EF4444]/30 text-xs flex items-start gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444] font-mono font-bold shrink-0">
                          Row {err.row}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-[#EF4444]">{err.reason}</span>
                          {err.question && (
                            <span className="text-[#667085] dark:text-[#94A3B8] ml-1 truncate block text-[11px]">
                              "{err.question}"
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Valid Rows Preview Table */}
              {importMCQPreviewData.valid_rows?.length > 0 && (
                <div className="space-y-2">
                  <div className="font-bold text-[#172033] dark:text-[#F8FAFC] flex items-center justify-between">
                    <span>Valid MCQs Preview ({importMCQPreviewData.valid_rows.length})</span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Ready to Import & Assign</span>
                  </div>

                  <div className="max-h-64 overflow-y-auto border border-[#D9E0E8] dark:border-[#30363D] rounded-2xl divide-y divide-[#D9E0E8] dark:divide-[#30363D]">
                    {importMCQPreviewData.valid_rows.map((row, rIdx) => (
                      <div key={rIdx} className="p-3.5 bg-[#FFFFFF] dark:bg-[#20252C] hover:bg-[#F5F7FA] dark:hover:bg-[#151A21] transition space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="w-5 h-5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                              {rIdx + 1}
                            </span>
                            <span className="font-bold text-[#172033] dark:text-[#F8FAFC] leading-snug">{row.question}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold shrink-0">
                            Correct: Option {row.correctOption}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pl-7">
                          {row.options.map((opt, oIdx) => {
                            const isCorrect = row.correctOption === (oIdx + 1);
                            return (
                              <div
                                key={oIdx}
                                className={`p-2 rounded-xl border flex items-center gap-1.5 ${
                                  isCorrect
                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold'
                                    : 'bg-[#F5F7FA] dark:bg-[#151A21] border-[#D9E0E8] dark:border-[#30363D] text-[#667085] dark:text-[#94A3B8]'
                                }`}
                              >
                                <span className="font-mono text-[10px] opacity-75">{oIdx + 1}.</span>
                                <span className="truncate">{opt}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="pt-3 border-t border-[#D9E0E8] dark:border-[#30363D] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsImportMCQModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#667085] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-[#F8FAFC] font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCommitImportMCQ}
              disabled={importMCQCommitLoading || !importMCQPreviewData || importMCQPreviewData.valid_count === 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {importMCQCommitLoading
                  ? 'Importing MCQs...'
                  : importMCQPreviewData
                  ? `Import & Assign (${importMCQPreviewData.valid_count})`
                  : 'Import & Assign MCQs'}
              </span>
            </button>
          </div>
        </div>
      </Modal>

      {/* BROWSER MCQ BULK DELETE MODAL */}
      <Modal
        isOpen={isBrowserMcqDeleteModalOpen}
        onClose={() => !browserDeleteLoading && setIsBrowserMcqDeleteModalOpen(false)}
        title="Confirm Delete"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-[#EF4444]">
                Are you sure you want to delete {browserSelectedMcqIds.length} selected question{browserSelectedMcqIds.length > 1 ? 's' : ''}?
              </p>
              <p className="text-[#667085] dark:text-[#94A3B8]">
                This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={browserDeleteLoading}
              onClick={() => setIsBrowserMcqDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#667085] dark:text-[#94A3B8] font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={browserDeleteLoading}
              onClick={handleConfirmBrowserDeleteMCQs}
              className="px-5 py-2 rounded-xl bg-[#EF4444] hover:bg-red-700 text-white font-bold shadow-md shadow-red-500/20 disabled:opacity-50 flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{browserDeleteLoading ? 'Deleting...' : 'Delete'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* BROWSER PROBLEM BULK DELETE MODAL */}
      <Modal
        isOpen={isBrowserProblemDeleteModalOpen}
        onClose={() => !browserDeleteLoading && setIsBrowserProblemDeleteModalOpen(false)}
        title="Confirm Delete"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-[#EF4444]">
                Are you sure you want to delete {browserSelectedProblemIds.length} selected question{browserSelectedProblemIds.length > 1 ? 's' : ''}?
              </p>
              <p className="text-[#667085] dark:text-[#94A3B8]">
                This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={browserDeleteLoading}
              onClick={() => setIsBrowserProblemDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-[#667085] dark:text-[#94A3B8] font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={browserDeleteLoading}
              onClick={handleConfirmBrowserDeleteProblems}
              className="px-5 py-2 rounded-xl bg-[#EF4444] hover:bg-red-700 text-white font-bold shadow-md shadow-red-500/20 disabled:opacity-50 flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{browserDeleteLoading ? 'Deleting...' : 'Delete'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
