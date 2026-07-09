// App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'; 
import MockTest from './pages/MockTest';
import UserAllAnalysis from './pages/UserAllAnalysis';
import UserSubjectAnallysis from './pages/UserSubjectAnallysis';
import UserTopicAnalysis from './pages/UserTopicAnalysis';
import Login from './pages/Login';
import Singup from './pages/Singup';
// import AnalysisPage from './pages/AnalysisPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';


// UserTopicAnalysis

const App = () => { 
  return (
    // BrowserRouter sabse bahar hona chahiye
    <BrowserRouter>
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
    </BrowserRouter>
  )
}

export default App;