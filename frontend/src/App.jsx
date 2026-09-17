// App.jsx
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockTest from './pages/MockTest';
import UserAllAnalysis from './pages/UserAllAnalysis';
import UserSubjectAnallysis from './pages/UserSubjectAnallysis';
import UserTopicAnalysis from './pages/UserTopicAnalysis';
import Login from './pages/Login';
import Singup from './pages/Singup';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import Challenge from './pages/Challenge';
import ChallengeReview from './pages/ChallengeReview';
import MyChallenges from './pages/MyChallenges';
import PreviousYearTests from './pages/PreviousYearTests';
import PreviousYearTest from './pages/PreviousYearTest';
import CurrentAffairs from './pages/CurrentAffairs';
import MyBatch from './pages/MyBatch';
// 👇 NAYE: student ke liye Custom Test pages (backend pehle se ready tha,
// sirf UI missing tha — teacher test banata tha lekin student le hi nahi pata tha)
import CustomTests from './pages/CustomTests';
import CustomTest from './pages/CustomTest';
import ForgotPassword from './pages/ForgotPassword';

// Teacher pages
import TeacherLogin from './pages/teacher/TeacherLogin';
import TeacherSignup from './pages/teacher/TeacherSignup';
import AcceptInvite from './pages/teacher/AcceptInvite';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherContent from './pages/teacher/TeacherContent';
import TeacherSubTeachers from './pages/teacher/TeacherSubTeachers';
import TeacherAddQuestion from './pages/teacher/TeacherAddQuestion';
import TeacherPYQPapers from './pages/teacher/TeacherPYQPapers';
import TeacherPYQPaperFill from './pages/teacher/TeacherPYQPaperFill';
import TeacherCustomTests from './pages/teacher/TeacherCustomTests';
import TeacherCustomTestResults from './pages/teacher/TeacherCustomTestResults'; // 🆕
import TeacherStudentSearch from './pages/teacher/TeacherStudentSearch';
import TeacherStudentAnalysis from './pages/teacher/TeacherStudentAnalysis';
import TeacherStudentSubjectAnalysis from './pages/teacher/TeacherStudentSubjectAnalysis';
import TeacherStudentTopicAnalysis from './pages/teacher/TeacherStudentTopicAnalysis';
import TeacherClassAnalysis from './pages/teacher/TeacherClassAnalysis';
import TeacherCoupons from './pages/teacher/TeacherCoupons';
import TeacherForgotPassword from './pages/teacher/TeacherForgotPassword'; // 🆕

// 🆕 Admin pages (magic-link login)
import AdminLogin from './pages/AdminLogin';
import AdminVerify from './pages/AdminVerify';
import AdminPanel from './pages/AdminPanel';

// 🆕 CHANGE — pehle staleTime sirf 30 second tha, matlab 30 second se
// purana koi bhi page dobara khulte hi turant refetch ho jata tha (isliye
// "har baar navigate karne par data reload hota hai" jaisa mehsoos hota
// tha). Ab 2 minute — is dauraan wapas aane par cache se turant dikhega,
// aur usi 2 minute ke baad bhi background mein khud refresh ho jayega
// (refetchOnMount default "true" hi hai) bina screen ko blank/loading
// dikhाye. refetchOnWindowFocus band kiya — tab switch karte hi baar baar
// network call jaana annoying tha.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minute tak "fresh" — turant cache se dikhega
      gcTime: 15 * 60 * 1000, // 15 minute tak cache memory mein rakha rahega
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ─────────────────────────────────────────────
// 🐛 FIX: pehle koi bhi galat URL par BILKUL BLANK safed page aata tha
// (koi catch-all route hi nahi tha) — samajh hi nahi aata tha ki galti kya hui.
//
// Pehle maine ise chup-chaap HomePage par redirect kar diya tha, lekin usse
// aur confusion hui: lagta tha "teacher page khul hi nahi raha". Ab saaf
// screen dikhti hai jisme URL bhi likha hota hai aur seedhe links bhi hain.
// ─────────────────────────────────────────────
const NotFound = () => {
  const location = useLocation();
  const linkCls =
    'block w-full py-3 rounded-xl border border-gray-700 text-gray-300 hover:border-[#7C3AED] hover:text-white text-center text-sm transition-colors';

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="text-5xl mb-4">🧭</div>
        <h1 className="text-xl font-bold mb-2">Ye page nahi mila</h1>
        <p className="text-gray-400 text-sm mb-1">Aapne ye address khola tha:</p>
        <p className="text-xs font-mono text-[#A78BFA] bg-[#111827] border border-gray-800 rounded-lg px-3 py-2 mb-6 break-all">
          #{location.pathname}
        </p>

        <p className="text-[11px] text-gray-500 mb-4 leading-relaxed">
          Dhyan dein: is site ke saare address me <b className="text-gray-300">#</b> aata hai —
          jaise <span className="font-mono text-gray-300">site.com/#/TeacherLogin</span>.
          Bina <b className="text-gray-300">#</b> ke likhne par hamesha HomePage hi khulta hai.
        </p>

        <div className="space-y-2.5">
          <Link to="/HomePage" className={linkCls}>🏠 Student Home</Link>
          <Link to="/Login" className={linkCls}>👤 Student Login</Link>
          <Link to="/TeacherLogin" className={linkCls}>🧑‍🏫 Teacher Login</Link>
          <Link to="/TeacherDashboard" className={linkCls}>📊 Teacher Dashboard</Link>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <div>
          <Routes>
            {/* ── Student ── */}
            <Route path="/" element={<HomePage />} />
            <Route path="/HomePage" element={<HomePage />} />
            <Route path="/MockTest" element={<MockTest />} />
            <Route path="/UserAllAnalysis" element={<UserAllAnalysis />} />
            <Route path="/UserSubjectAnallysis" element={<UserSubjectAnallysis />} />
            <Route path="/UserTopicAnalysis" element={<UserTopicAnalysis />} />
            <Route path="/AnalysisPage" element={<UserAllAnalysis />} />
            <Route path="/ProfilePage" element={<ProfilePage />} />

            <Route path="/Login" element={<Login />} />
            <Route path="/Singup" element={<Singup />} />
            {/* 🐛 FIX: "Signup" (sahi spelling) type karne par blank page aata tha */}
            <Route path="/Signup" element={<Singup />} />
            <Route path="/ForgotPassword" element={<ForgotPassword />} />

            {/* 🆕 Admin — passwordless magic-link login */}
            <Route path="/AdminLogin" element={<AdminLogin />} />
            <Route path="/AdminVerify" element={<AdminVerify />} />
            <Route path="/AdminPanel" element={<AdminPanel />} />

            <Route path="/Challenge" element={<Challenge />} />
            <Route path="/Challenge/:code" element={<Challenge />} />
            <Route path="/Challenge/:code/review" element={<ChallengeReview />} />
            <Route path="/MyChallenges" element={<MyChallenges />} />

            <Route path="/PreviousYearTests" element={<PreviousYearTests />} />
            <Route path="/PreviousYearTest/:testId" element={<PreviousYearTest />} />

            {/* 👇 NAYE routes — batch ke custom tests */}
            <Route path="/CustomTests" element={<CustomTests />} />
            <Route path="/CustomTest/:testId" element={<CustomTest />} />

            <Route path="/CurrentAffairs" element={<CurrentAffairs />} />
            <Route path="/CurrentAffairs/:date" element={<CurrentAffairs />} />
            <Route path="/MyBatch" element={<MyBatch />} />

            {/* ── Teacher ── */}
            <Route path="/TeacherLogin" element={<TeacherLogin />} />
            <Route path="/TeacherSignup" element={<TeacherSignup />} />
            <Route path="/TeacherForgotPassword" element={<TeacherForgotPassword />} /> {/* 🆕 */}
            <Route path="/AcceptInvite/:token" element={<AcceptInvite />} />
            <Route path="/TeacherDashboard" element={<TeacherDashboard />} />
            <Route path="/TeacherContent" element={<TeacherContent />} />
            <Route path="/TeacherSubTeachers" element={<TeacherSubTeachers />} />
            <Route path="/TeacherAddQuestion" element={<TeacherAddQuestion />} />
            <Route path="/TeacherPYQPapers" element={<TeacherPYQPapers />} />
            <Route
              path="/TeacherPYQPaperFill/:paperId/:subjectName"
              element={<TeacherPYQPaperFill />}
            />
            <Route path="/TeacherCustomTests" element={<TeacherCustomTests />} />
            <Route path="/TeacherCustomTestResults/:testId" element={<TeacherCustomTestResults />} /> {/* 🆕 */}
            <Route path="/TeacherStudentSearch" element={<TeacherStudentSearch />} />
            <Route path="/TeacherStudentAnalysis/:studentId" element={<TeacherStudentAnalysis />} />
            <Route
              path="/TeacherStudentSubjectAnalysis/:studentId"
              element={<TeacherStudentSubjectAnalysis />}
            />
            <Route
              path="/TeacherStudentTopicAnalysis/:studentId"
              element={<TeacherStudentTopicAnalysis />}
            />
            <Route path="/TeacherClassAnalysis" element={<TeacherClassAnalysis />} />
            <Route path="/TeacherCoupons" element={<TeacherCoupons />} />

            {/* Galat URL par blank page ke bajaye ab helpful screen */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </HashRouter>
    </QueryClientProvider>
  );
};

export default App;
