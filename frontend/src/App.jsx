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

// Ek hi QueryClient poore app ke liye — cache yahi store hoti hai
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 1 min tak data "fresh" maana jayega, dobara fetch nahi hoga
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
          </Routes>
        </div>
      </HashRouter>
    </QueryClientProvider>
  )
}

export default App;