import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/Home/HomePage';
import { LoginPage } from './pages/Auth/LoginPage';
import { ConsumerComplaintTemplate } from './pages/mootcourt/template/ConsumerComplaintTemplate';
import { ComplaintPreview } from './pages/mootcourt/preview/ComplaintPreview';
import { JudgeQuestions } from './pages/mootcourt/questions/JudgeQuestions';
import { VerdictPrediction } from './pages/mootcourt/prediction/VerdictPrediction';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/mootcourt/template" element={<ConsumerComplaintTemplate />} />
        <Route path="/mootcourt/preview" element={<ComplaintPreview />} />
        <Route path="/mootcourt/questions" element={<JudgeQuestions />} />
        <Route path="/mootcourt/prediction" element={<VerdictPrediction />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
