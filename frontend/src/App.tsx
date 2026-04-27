import './App.css'
import { Routes, Route } from "react-router-dom";
import LandingPage from './pages/LandingPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import SignupPage from './pages/SignupPage.tsx';
import DashboardLayout from './pages/Dashboard.jsx';
import ProjectOverview from './pages/ProjectOverview.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import NewProject from './pages/NewProject.jsx';

function App() {
  return (
    
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />


      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<ProjectOverview />} />
        </Route>
        <Route path="/new" element={<NewProject />} />
      </Route>
    </Routes>
  )
}

export default App;