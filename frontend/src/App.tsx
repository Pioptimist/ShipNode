import './App.css'
import { Routes, Route } from "react-router-dom";
import LandingPage from './pages/LandingPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import SignupPage from './pages/SignupPage.tsx';
import DashboardLayout from './pages/Dashboard.jsx';

import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import NewProject from './pages/NewProject.jsx';
import Projects from './pages/Projects.jsx';
import Deployments from './pages/Deployments.jsx';
import ImportProject from './pages/ImportProject.jsx';
import ProjectOverview from './pages/ProjectOverview.jsx';

function App() {
  return (
    
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />


      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          {/* 1. The Index route (loads when you hit /dashboard) */}
          <Route index element={<Projects />} />

          {/* 2. The Deployments tab (loads when you hit /dashboard/deployments) */}
          <Route path="deployments" element={<Deployments />} />

          {/* (Future tabs like /dashboard/settings will go here) */}
        </Route>
        <Route path="/new" element={<NewProject />} />
        <Route path="/import" element={<ImportProject />} />

        <Route path="/project/:id" element={<ProjectOverview />} />
      </Route>
    </Routes>
  )
}

export default App;