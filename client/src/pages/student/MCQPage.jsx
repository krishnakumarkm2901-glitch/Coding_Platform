import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import confetti from 'canvas-confetti';
import { 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  ArrowRight, 
  RotateCcw, 
  Award, 
  Filter,
  ChevronDown 
} from 'lucide-react';
import { DifficultyBadge, TopicTag } from '../../components/common/Badge';
import { PageLoader } from '../../components/common/Loader';

export const MCQPage = () => {
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [mcqs, setMcqs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quiz state
  const [userAnswers, setUserAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTopics();
  }, []);

  useEffect(() => {
    fetchMCQs();
  }, [selectedTopic]);

  const fetchTopics = async () => {
    try {
      const res = await api.get('/mcqs/topics');
      if (res.data.success) {
        setTopics(res.data.topics);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMCQs = async () => {
    try {
      setLoading(true);
      setUserAnswers({});
      setQuizSubmitted(false);
      setQuizResults(null);

      const params = {
        topic: selectedTopic !== 'All' ? selectedTopic : undefined,
        limit: 15,
      };
      const res = await api.get('/mcqs', { params });
      if (res.data.success) {
        setMcqs(res.data.mcqs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (mcqId, option) => {
    if (quizSubmitted) return;
    setUserAnswers((prev) => ({
      ...prev,
      [mcqId]: option,
    }));
  };

  const handleSubmitQuiz = async () => {
    try {
      setSubmitting(true);
      const res = await api.post('/mcqs/submit', {
        answers: userAnswers,
        topic: selectedTopic,
      });

      if (res.data.success) {
        setQuizResults(res.data);
        setQuizSubmitted(true);
        if (res.data.percentage >= 70) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setUserAnswers({});
    setQuizSubmitted(false);
    setQuizResults(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const answeredCount = Object.keys(userAnswers).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#172033] dark:text-[#F8FAFC] tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-[#0757B8] dark:text-[#60A5FA]" />
            Technical MCQ Assessment
          </h1>
          <p className="text-sm text-[#667085] dark:text-[#94A3B8] mt-1">
            Test and sharpen your Computer Science core concepts
          </p>
        </div>

        {/* Topic Filter */}
        <div className="relative inline-flex items-center">
          <label htmlFor="topic-filter-select" className="relative flex items-center cursor-pointer">
            <Filter className="w-4 h-4 text-[#0757B8] dark:text-[#60A5FA] absolute left-3.5 pointer-events-none z-10" />
            <select
              id="topic-filter-select"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="pl-9 pr-9 py-2.5 bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D] hover:border-[#0757B8]/50 dark:hover:border-[#60A5FA]/50 rounded-2xl text-[#172033] dark:text-[#F8FAFC] text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#0757B8]/20 transition shadow-sm cursor-pointer appearance-none"
            >
              <option value="All">All Topics</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#667085] dark:text-[#94A3B8] absolute right-3 pointer-events-none" />
          </label>
        </div>
      </div>

      {/* QUIZ RESULTS BANNER (When Submitted) */}
      {quizSubmitted && quizResults && (
        <div className="p-6 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DDF2FF] dark:bg-[#142A43] text-[#0757B8] dark:text-[#60A5FA] text-xs font-bold mb-2">
                <Award className="w-4 h-4" />
                Assessment Results
              </div>
              <h2 className="text-2xl font-extrabold text-[#172033] dark:text-[#F8FAFC]">
                You Scored {quizResults.score} out of {quizResults.total_questions} ({quizResults.percentage}%)
              </h2>
              <p className="text-xs text-[#667085] dark:text-[#94A3B8] mt-1">
                {quizResults.percentage >= 80 ? 'Outstanding mastery of the subject!' : quizResults.percentage >= 60 ? 'Solid performance, review missed topics below.' : 'Review explanations below to strengthen concepts.'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-center px-4 py-2 bg-[#22B573]/10 border border-[#22B573]/25 rounded-xl">
                <div className="text-lg font-bold text-[#22B573]">{quizResults.correct_count}</div>
                <div className="text-[10px] text-[#667085] dark:text-[#94A3B8] uppercase font-semibold">Correct</div>
              </div>
              <div className="text-center px-4 py-2 bg-[#EF4444]/10 border border-[#EF4444]/25 rounded-xl">
                <div className="text-lg font-bold text-[#EF4444]">{quizResults.wrong_count}</div>
                <div className="text-[10px] text-[#667085] dark:text-[#94A3B8] uppercase font-semibold">Wrong</div>
              </div>
              <button
                onClick={handleRetake}
                className="px-4 py-2.5 rounded-xl bg-[#0757B8] dark:bg-[#0066CC] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition"
              >
                <RotateCcw className="w-4 h-4" />
                Retake Quiz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions List */}
      {loading ? (
        <PageLoader text="Loading technical MCQs..." />
      ) : mcqs.length === 0 ? (
        <div className="p-12 text-center text-[#667085] dark:text-[#94A3B8] rounded-2xl bg-[#FFFFFF] dark:bg-[#20252C] border border-[#D9E0E8] dark:border-[#30363D]">
          No questions found for the selected topic.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Progress bar on top */}
          {!quizSubmitted && (
            <div className="flex items-center justify-between text-xs text-[#667085] dark:text-[#94A3B8] px-1 font-semibold">
              <span>Answered: <strong className="text-[#0757B8] dark:text-[#60A5FA]">{answeredCount}</strong> of {mcqs.length}</span>
              <span>{Math.round((answeredCount / mcqs.length) * 100)}% Complete</span>
            </div>
          )}

          {mcqs.map((mcq, idx) => {
            const selectedOption = userAnswers[mcq.id];
            const resultItem = quizResults?.results?.find((r) => r.id === mcq.id);

            return (
              <div
                key={mcq.id}
                className={`p-6 rounded-3xl border transition shadow-sm bg-[#FFFFFF] dark:bg-[#20252C] ${
                  resultItem
                    ? resultItem.is_correct
                      ? 'border-[#22B573] bg-[#22B573]/5'
                      : 'border-[#EF4444] bg-[#EF4444]/5'
                    : 'border-[#D9E0E8] dark:border-[#30363D] hover:border-[#0757B8]/40 dark:hover:border-[#0066CC]/40'
                }`}
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-[#0757B8] dark:bg-[#0066CC] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 font-mono shadow-sm">
                      Q{idx + 1}
                    </span>
                    <h3 className="text-base font-bold text-[#172033] dark:text-[#F8FAFC] leading-snug">
                      {mcq.question}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <TopicTag topic={mcq.topic} />
                    <DifficultyBadge difficulty={mcq.difficulty} />
                  </div>
                </div>

                {/* 4 Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  {mcq.options.map((opt, optIdx) => {
                    const isSelected = selectedOption === opt;
                    const isCorrect = resultItem && resultItem.correct_answer === opt;
                    const isWrongSelection = resultItem && isSelected && !resultItem.is_correct;

                    let btnStyle = 'bg-[#FFFFFF] dark:bg-[#151A21] border-[#D9E0E8] dark:border-[#30363D] text-[#172033] dark:text-[#F8FAFC] hover:border-[#0757B8] dark:hover:border-[#0066CC] hover:bg-[#F0F7FF] dark:hover:bg-[#142A43]';
                    
                    if (isSelected && !quizSubmitted) {
                      btnStyle = 'bg-[#DDF2FF] dark:bg-[#142A43] border-[#0757B8] dark:border-[#0066CC] text-[#0757B8] dark:text-[#60A5FA] font-bold shadow-sm';
                    }
                    if (quizSubmitted) {
                      if (isCorrect) {
                        btnStyle = 'bg-[#22B573]/15 border-[#22B573] text-[#22B573] font-bold';
                      } else if (isWrongSelection) {
                        btnStyle = 'bg-[#EF4444]/15 border-[#EF4444] text-[#EF4444] font-bold';
                      } else {
                        btnStyle = 'bg-[#F5F7FA] dark:bg-[#151A21]/60 border-[#D9E0E8] dark:border-[#30363D]/60 text-[#667085] dark:text-[#94A3B8] opacity-60';
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        disabled={quizSubmitted}
                        onClick={() => handleOptionSelect(mcq.id, opt)}
                        className={`p-3.5 rounded-2xl border text-left text-xs sm:text-sm flex items-center justify-between gap-3 transition ${btnStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            isSelected && !quizSubmitted
                              ? 'bg-[#0757B8] text-white border-[#0757B8]'
                              : 'border-[#D9E0E8] dark:border-[#30363D] text-[#667085] dark:text-[#94A3B8]'
                          }`}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt}</span>
                        </div>
                        {quizSubmitted && isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-[#22B573] shrink-0" />
                        )}
                        {quizSubmitted && isWrongSelection && (
                          <XCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation (Revealed on submit) */}
                {resultItem && (
                  <div className="mt-4 p-4 rounded-2xl bg-[#F5F7FA] dark:bg-[#151A21] border border-[#D9E0E8] dark:border-[#30363D] text-xs">
                    <div className="font-bold text-[#172033] dark:text-[#F8FAFC] mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#0757B8] dark:text-[#60A5FA]" />
                      Explanation:
                    </div>
                    <p className="text-[#667085] dark:text-[#94A3B8] leading-relaxed font-sans">
                      {resultItem.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {/* Submit Quiz Action Button */}
          {!quizSubmitted && (
            <div className="sticky bottom-4 z-20 p-4 rounded-3xl border border-[#D9E0E8] dark:border-[#30363D] bg-[#FFFFFF] dark:bg-[#20252C] shadow-2xl flex items-center justify-between">
              <div className="text-xs font-semibold text-[#172033] dark:text-[#F8FAFC]">
                <span>{answeredCount} of {mcqs.length} answered</span>
                {answeredCount < mcqs.length && (
                  <span className="text-[#F2B705] ml-2">({mcqs.length - answeredCount} remaining)</span>
                )}
              </div>
              <button
                onClick={handleSubmitQuiz}
                disabled={submitting || answeredCount === 0}
                className="px-6 py-2.5 rounded-xl bg-[#22B573] hover:opacity-95 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 transition disabled:opacity-50"
              >
                <span>{submitting ? 'Evaluating...' : 'Submit Assessment'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
