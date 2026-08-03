// App.jsx
import { HashRouter, Routes, Route } from 'react-router-dom'; 
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
import CurrentAffairs from './pages/CurrentAffairs'
import MyBatch from './pages/MyBatch';

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
import TeacherStudentSearch from './pages/teacher/TeacherStudentSearch';
import TeacherStudentAnalysis from './pages/teacher/TeacherStudentAnalysis';
import TeacherStudentSubjectAnalysis from './pages/teacher/TeacherStudentSubjectAnalysis';
import TeacherStudentTopicAnalysis from './pages/teacher/TeacherStudentTopicAnalysis';
import TeacherClassAnalysis from './pages/teacher/TeacherClassAnalysis';
import TeacherCoupons from './pages/teacher/TeacherCoupons';



const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
    },
  },
});

const App = () => { 
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <div>
          <Routes>
            <Route path="/" element={<HomePage/>} />
            <Route path="/MockTest" element={<MockTest/>} />
            <Route path="/UserAllAnalysis" element={<UserAllAnalysis/>} />
            <Route path="/UserSubjectAnallysis" element={<UserSubjectAnallysis/>} />
            <Route path="/UserTopicAnalysis" element={<UserTopicAnalysis/>} />
            <Route path="/Login" element={<Login/>} />
            <Route path="/Singup" element={<Singup/>} />
            <Route path="/AnalysisPage" element={<UserAllAnalysis/>} />
            <Route path="/HomePage" element={<HomePage/>} />
            <Route path="/ProfilePage" element={<ProfilePage/>} />
            <Route path="/Challenge" element={<Challenge/>} />
            <Route path="/Challenge/:code" element={<Challenge/>} />
            <Route path="/Challenge/:code/review" element={<ChallengeReview/>} />
            <Route path="/MyChallenges" element={<MyChallenges/>} />
            <Route path="/PreviousYearTests" element={<PreviousYearTests/>} />
            <Route path="/PreviousYearTest/:testId" element={<PreviousYearTest/>} />
            <Route path="/CurrentAffairs" element={<CurrentAffairs/>} />
            <Route path="/MyBatch" element={<MyBatch/>} />

            {/* Teacher routes */}
            <Route path="/TeacherLogin" element={<TeacherLogin/>} />
            <Route path="/TeacherSignup" element={<TeacherSignup/>} />
            <Route path="/AcceptInvite/:token" element={<AcceptInvite/>} />
            <Route path="/TeacherDashboard" element={<TeacherDashboard/>} />
            <Route path="/TeacherSubTeachers" element={<TeacherSubTeachers/>} />
            <Route path="/TeacherAddQuestion" element={<TeacherAddQuestion/>} />
            <Route path="/TeacherPYQPapers" element={<TeacherPYQPapers/>} />
            <Route path="/TeacherPYQPaperFill/:paperId/:subjectName" element={<TeacherPYQPaperFill/>} />
            <Route path="/TeacherCustomTests" element={<TeacherCustomTests/>} />
            <Route path="/TeacherStudentSearch" element={<TeacherStudentSearch/>} />
            <Route path="/TeacherStudentAnalysis/:studentId" element={<TeacherStudentAnalysis/>} />
            <Route path="/TeacherStudentSubjectAnalysis/:studentId" element={<TeacherStudentSubjectAnalysis/>} />
            <Route path="/TeacherStudentTopicAnalysis/:studentId" element={<TeacherStudentTopicAnalysis/>} />
            <Route path="/TeacherClassAnalysis" element={<TeacherClassAnalysis/>} />
            <Route path="/TeacherCoupons" element={<TeacherCoupons/>} />


            <Route path="/TeacherContent" element={<TeacherContent/>} />
          </Routes>
        </div>
      </HashRouter>
    </QueryClientProvider>
  )
}

export default App;