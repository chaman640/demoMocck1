// App.jsx
import { HashRouter, Routes, Route } from 'react-router-dom'; 
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
    // HashRouter sabse bahar hona chahiye taaki Render par reload karne pe 404 error na aaye
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
  )
}

export default App;