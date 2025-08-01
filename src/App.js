import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CoachDashboard from './components/CoachDashboard';
import AuthWrapper from './components/AuthWrapper';
import AuthCallback from './components/AuthCallback';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/" element={
            <AuthWrapper>
              <CoachDashboard />
            </AuthWrapper>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 