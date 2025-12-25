import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { HomePage } from './pages/Home/HomePage';
import { LoginPage } from './pages/Auth/LoginPage';
import { MyCases } from './pages/mainpage/MyCases';
import { DocumentIntro } from './pages/mootcourt/intro/DocumentIntro';
import { ConsumerComplaintTemplate } from './pages/mootcourt/template/ConsumerComplaintTemplate';
import { ComplaintPreview } from './pages/mootcourt/preview/ComplaintPreview';
import { DocumentZoomOut } from './pages/mootcourt/transition/DocumentZoomOut';
import { JudgeQuestions } from './pages/mootcourt/questions/JudgeQuestions';
import { VerdictPrediction } from './pages/mootcourt/prediction/VerdictPrediction';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/my-cases" element={
            <ProtectedRoute>
              <MyCases />
            </ProtectedRoute>
          } />
          <Route path="/mootcourt/intro" element={
            <ProtectedRoute>
              <DocumentIntro />
            </ProtectedRoute>
          } />
          <Route path="/mootcourt/template" element={
            <ProtectedRoute>
              <ConsumerComplaintTemplate />
            </ProtectedRoute>
          } />
          <Route path="/mootcourt/preview" element={
            <ProtectedRoute>
              <ComplaintPreview />
            </ProtectedRoute>
          } />
          <Route path="/mootcourt/transition" element={
            <ProtectedRoute>
              <DocumentZoomOut />
            </ProtectedRoute>
          } />
          <Route path="/mootcourt/questions" element={
            <ProtectedRoute>
              <JudgeQuestions />
            </ProtectedRoute>
          } />
          <Route path="/mootcourt/prediction" element={
            <ProtectedRoute>
              <VerdictPrediction />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
