import React, { useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/api";
import TeacherBottomNav from "../../components/TeacherBottomNav";

const SkeletonBlock = ({ className = "" }) => <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />;

const TeacherStudentSubjectAnalysis = () => {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const location = useLocation();
  const { examName, studentName, subjectName } = location.state || {};

  // 👇 FIX: navigate render ke beech mein nahi, useEffect ke andar
  useEffect(() => {
    if (!examName || !subjectName) {
      navigate("/TeacherStudentSearch");
    }
  }, [examName, subjectName, navigate]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["teacher-student-subject", studentId, examName, subjectName],
    queryFn: async () => {
      const res = await api.get(
        `/teacher/analysis/subject/${studentId}/${encodeURIComponent(examName)}/${encodeURIComponent(subjectName)}`
      );
      return res.data;
    },
    enabled: !!studentId && !!examName && !!subjectName,
  });

  if (!examName || !subjectName) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
        <div className="max-w-2xl mx-auto space-y-4">
          <SkeletonBlock className="w-40 h-6" />
          <SkeletonBlock className="w-full h-24 rounded-2xl" />
          <SkeletonBlock className="w-full h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6 pb-24">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">{error?.response?.data?.message || "Data load nahi ho paaya."}</p>
          <button onClick={() => navigate(-1)} className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">
            Wapas Jaayein
          </button>
        </div>
        <TeacherBottomNav />
      </div>
    );
  }

  const subj = data.data;

  const goToTopic = (topicName) => {
    navigate(`/TeacherStudentTopicAnalysis/${studentId}`, {
      state: { examName, studentName, subjectName, topicName },
    });
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
          &larr; {studentName || "Student"} Par Wapas
        </button>

        <div>
          <h1 className="text-2xl font-bold mb-1">{subj?.subjectName || subjectName}</h1>
          <p className="text-gray-400 text-sm">{studentName} ka last 3 mocks ka data</p>
        </div>

        {!subj ? (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-400">Is subject ka data nahi mila.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
                <p className="text-xs text-gray-500 mb-1">Avg. Accuracy</p>
                <p className="text-xl font-bold text-green-400">{subj.averageAccuracy}%</p>
              </div>
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
                <p className="text-xs text-gray-500 mb-1">Avg Time / Q</p>
                <p className="text-xl font-bold text-blue-400">{subj.averageTimePerQuestion}s</p>
              </div>
            </div>

            <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800">
                <h3 className="font-semibold text-sm">Topic-wise Efficiency</h3>
              </div>
              {subj.topicList?.length === 0 ? (
                <p className="p-6 text-sm text-gray-500">Koi topic data nahi hai.</p>
              ) : (
                <div className="divide-y divide-gray-800">
                  {subj.topicList.map((t, i) => (
                    <button key={i} onClick={() => goToTopic(t.topicName)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#1F2937]/50">
                      <p className="text-sm text-gray-200 truncate flex-1">{t.topicName}</p>
                      <span className="flex-shrink-0 px-2 py-0.5 rounded text-xs font-semibold text-green-400 bg-green-500/10">
                        {t.correctCount}/{t.totalAttempted}
                      </span>
                      <span className="text-[#A78BFA] text-xs flex-shrink-0">→</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-red-900/30 bg-red-900/10">
                <h3 className="font-semibold text-sm text-red-400">Top Weak Topics</h3>
              </div>
              {subj.weakTopics?.length === 0 ? (
                <p className="p-6 text-sm text-green-400">Koi khaas kamzor topic nahi mila.</p>
              ) : (
                <div className="divide-y divide-gray-800">
                  {subj.weakTopics.map((t, i) => (
                    <button key={i} onClick={() => goToTopic(t.topicName)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-red-500/5">
                      <p className="text-sm text-gray-200 truncate flex-1">{t.topicName}</p>
                      <span className="flex-shrink-0 text-xs text-red-300">{t.wrongCount} galat</span>
                      <span className="text-red-300 text-xs flex-shrink-0">→</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <TeacherBottomNav />
    </div>
  );
};

export default TeacherStudentSubjectAnalysis;