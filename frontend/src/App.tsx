import './App.css'
import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from './pages/LandingPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import SignupPage from './pages/SignupPage.tsx';
import DashboardLayout from './pages/AppLayout.jsx';

import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import NewProject from './pages/NewProject.jsx';
import Projects from './pages/Projects.jsx';
import Deployments from './pages/Deployments.jsx';
import ImportProject from './pages/ImportProject.jsx';
import ProjectOverview from './pages/ProjectOverview.jsx';
import AppLayout from './pages/AppLayout.jsx';
import DomainsPage from './pages/DomainsPage.jsx';
import SecuritySettings from './components/settings/SecuritySettings.jsx';
import GeneralSettings from './components/settings/GeneralSettings.jsx';
import SettingsLayout from './pages/SettingsLayout.jsx';

function App() {
  return (
    
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />


      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>

          {/* Global Account Routes */}
          <Route path="/dashboard" element={<Projects />} />
          <Route path="/dashboard/deployments" element={<Deployments />} />
          <Route path="/dashboard/domains" element={<DomainsPage />} />

          <Route path="/dashboard/settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="general" replace />} />
            <Route path="general" element={<GeneralSettings />} />
            <Route path="security" element={<SecuritySettings />} />
          </Route>
          
          {/* Specific Project Routes */}
          <Route path="/project/:id" element={<ProjectOverview />} />
          {/* <Route path="/project/:id/deployments" element={<ProjectDeployments />} /> */}

        </Route>
        <Route path="/new" element={<NewProject />} />
        <Route path="/import" element={<ImportProject />} />

        <Route path="/project/:id" element={<ProjectOverview />} />
      </Route>
    </Routes>
  )
}

export default App;