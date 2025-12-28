import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/src/components/common/Button';
import { NoiseOverlay } from '@/src/components/common/NoiseOverlay';
import { supabase } from '@/src/lib/supabase';

interface PredictionRecord {
  id: string;
  case_title: string;
  case_type: string;
  claim_amount: string;
  consumer_description: string;
  opposite_party_description: string;
  case_strength: string;
  success_probability: string;
  liability_status: string;
  recommended_forum: string;
  compensation_minimum: string;
  compensation_maximum: string;
  compensation_most_likely: string;
  prediction_json: any;
  created_at: string;
}

interface ComplaintFormData {
  complainantName: string;
  oppositePartyName: string;
  claimConsideration: string;
  deficiencyType: string;
}

export const VerdictPrediction: React.FC = () => {
  const navigate = useNavigate();
  const [complaintData, setComplaintData] = useState<ComplaintFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading prediction...');
  const [predictionRecord, setPredictionRecord] = useState<PredictionRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load complaint data from localStorage for display
    const savedData = localStorage.getItem('consumerComplaintData');
    if (savedData) {
      setComplaintData(JSON.parse(savedData));
    }

    // Get the prediction ID from localStorage (set by ComplaintPreview)
    const predictionId = localStorage.getItem('currentPredictionId');
    
    if (predictionId) {
      fetchPredictionFromSupabase(predictionId);
    } else {
      setIsLoading(false);
      setError('No prediction ID found. Please submit your complaint first.');
    }
  }, []);

  const fetchPredictionFromSupabase = async (predictionId: string) => {
    try {
      setLoadingMessage('Fetching AI prediction from database...');
      
      const { data, error: fetchError } = await supabase
        .from('judgment_predictions')
        .select('*')
        .eq('id', predictionId)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (!data) {
        throw new Error('Prediction not found');
      }

      setPredictionRecord(data as PredictionRecord);
      console.log('Fetched prediction:', data);
    } catch (err) {
      console.error('Error fetching prediction:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch prediction');
    } finally {
      setIsLoading(false);
    }
  };

  const getVerdictText = (): string => {
    if (!predictionRecord) return '';
    
    // Parse prediction_json if it's a string
    let json = predictionRecord.prediction_json;
    if (typeof json === 'string') {
      try {
        json = JSON.parse(json);
      } catch (e) {
        return 'Prediction analysis complete.';
      }
    }
    
    // Try to construct a verdict from the prediction JSON
    if (json?.Judgment_Reasoning?.Findings) {
      return json.Judgment_Reasoning.Findings;
    }
    
    if (json?.Relief_Granted?.Primary_Relief?.Description) {
      return `${json.Judgment_Reasoning?.Inference || ''}\n\n${json.Relief_Granted.Primary_Relief.Description}`;
    }
    
    // Fallback to case summary
    return json?.Case_Summary?.Facts_of_Case?.join('\n') || 
           predictionRecord.case_type || 
           'Prediction analysis complete.';
  };

  const handleDownload = () => {
    if (!predictionRecord) return;
    
    // Create a JSON file with the full prediction
    const element = document.createElement('a');
    // Parse the prediction_json if it's a string
    let predictionData = predictionRecord.prediction_json;
    if (typeof predictionData === 'string') {
      try {
        predictionData = JSON.parse(predictionData);
      } catch (e) {
        console.error('Error parsing prediction_json for download:', e);
      }
    }
    const content = JSON.stringify(predictionData, null, 2);
    const file = new Blob([content], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = `Verdict_${predictionRecord.case_title || 'prediction'}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleNewCase = () => {
    // Clear all stored data
    localStorage.removeItem('consumerComplaintData');
    localStorage.removeItem('consumerComplaintFiles');
    localStorage.removeItem('judgeQASession');
    localStorage.removeItem('currentPredictionId');
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="relative min-h-screen w-full bg-[#fbf7ef] flex items-center justify-center">
        <NoiseOverlay />
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 border-4 border-black/20 border-t-black rounded-full animate-spin mx-auto mb-6"></div>
          <p className="font-serif text-xl text-black/70">Preparing Final Verdict...</p>
          <p className="font-sans text-sm text-black/50 mt-2">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (error || !predictionRecord) {
    return (
      <div className="relative min-h-screen w-full bg-[#fbf7ef] flex items-center justify-center">
        <NoiseOverlay />
        <div className="relative z-10 text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="font-serif text-xl text-black/70 mb-2">Unable to Load Prediction</h2>
          <p className="font-sans text-sm text-black/50 mb-6">{error || 'Prediction data not found'}</p>
          <Button variant="primary" onClick={() => navigate('/mootcourt/template')}>
            Go Back to Form
          </Button>
        </div>
      </div>
    );
  }

  // Extract data from prediction record
  // Handle case where prediction_json might be a string that needs parsing
  let json: any = {};
  try {
    if (typeof predictionRecord.prediction_json === 'string') {
      json = JSON.parse(predictionRecord.prediction_json);
    } else {
      json = predictionRecord.prediction_json || {};
    }
  } catch (e) {
    console.error('Error parsing prediction_json:', e);
    json = {};
  }
  
  const caseSummary = json?.Case_Summary || {};
  const judgmentReasoning = json?.Judgment_Reasoning || {};
  const reliefGranted = json?.Relief_Granted || {};
  const legalGrounds = json?.Legal_Grounds || {};
  const simulationMetadata = json?.Simulation_Metadata || {};

  return (
    <div className="relative min-h-screen w-full bg-[#fbf7ef]">
      <NoiseOverlay />

      <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-10">
          {/* Court Emblem/Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-black/5 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-black/70"
            >
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
          </div>
        </div>

        {/* Verdict Card */}
        <div className="bg-[#FAF3E8] border border-[#EBEBEB] rounded-2xl overflow-hidden shadow-sm">
          {/* Card Header */}
          <div className="bg-black text-white px-6 md:px-8 py-6 text-center">
            <p className="font-sans text-sm uppercase tracking-wider text-white/70 mb-3">
              Consumer Disputes Redressal Forum
            </p>
            <h2 className="font-serif text-4xl md:text-4xl font-medium">
              AI Judgment Prediction
            </h2>
          </div>

          {/* Verdict Content */}
          <div className="px-6 md:px-8 py-8">
            {/* Case Info */}
            <div className="flex flex-wrap justify-between gap-4 mb-8 pb-6 border-b border-black/10">
              <div>
                <p className="font-sans text-xs text-black/50 mb-1">Case Title</p>
                <p className="font-sans text-sm font-medium text-black">
                  {predictionRecord.case_title || caseSummary.Title || 'Consumer Complaint'}
                </p>
              </div>
              <div>
                <p className="font-sans text-xs text-black/50 mb-1">Date of Analysis</p>
                <p className="font-sans text-sm font-medium text-black">
                  {new Date(predictionRecord.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="font-sans text-xs text-black/50 mb-1">Case Strength</p>
                <p className={`font-sans text-sm font-medium ${
                  predictionRecord.case_strength === 'Strong' ? 'text-red-600' : 
                  predictionRecord.case_strength === 'Moderate' ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {predictionRecord.case_strength || simulationMetadata.Case_Strength || 'N/A'}
                </p>
              </div>
              <div>
                <p className="font-sans text-xs text-black/50 mb-1">Success Probability</p>
                <p className="font-sans text-sm font-medium text-black">
                  {predictionRecord.success_probability || simulationMetadata.Success_Probability || 'N/A'}
                </p>
              </div>
            </div>

            {/* Case Summary */}
            {caseSummary.Consumer_Details && (
              <div className="mb-6 pb-6 border-b border-black/10">
                <h3 className="font-sans text-base font-medium text-black/70 uppercase tracking-wider mb-4">
                  Case Overview
                </h3>
                <p className="font-sans text-base text-black/80 mb-4">
                  {caseSummary.Consumer_Details.Description || predictionRecord.consumer_description}
                </p>
                {caseSummary.Consumer_Details.Key_Grievances && (
                  <div className="mt-3">
                    <p className="font-sans text-sm font-medium text-black/60 mb-2">Key Grievances:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {caseSummary.Consumer_Details.Key_Grievances.map((grievance: string, idx: number) => (
                        <li key={idx} className="font-sans text-sm text-black/70">{grievance}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Judgment Reasoning */}
            {judgmentReasoning.Findings && (
              <div className="mb-6 pb-6 border-b border-black/10">
                <h3 className="font-sans text-base font-medium text-black/70 uppercase tracking-wider mb-4">
                  Judgment Findings
                </h3>
                <div className="font-serif text-lg leading-relaxed text-black whitespace-pre-wrap">
                  {judgmentReasoning.Findings}
                </div>
                {judgmentReasoning.Liability_Status && (
                  <div className="mt-4 flex items-center gap-2">
                    <span className="font-sans text-sm text-black/60">Liability:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      judgmentReasoning.Liability_Status === 'Established' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {judgmentReasoning.Liability_Status}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Relief Granted */}
            {reliefGranted.Primary_Relief && (
              <div className="mb-6 pb-6 border-b border-black/10">
                <h3 className="font-sans text-base font-medium text-black/70 uppercase tracking-wider mb-4">
                  Predicted Relief
                </h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="font-sans text-sm font-medium text-green-800 mb-1">
                    {reliefGranted.Primary_Relief.Type}
                  </p>
                  {reliefGranted.Primary_Relief.Amount && (
                    <p className="font-sans text-lg font-bold text-green-900">
                      {reliefGranted.Primary_Relief.Amount}
                    </p>
                  )}
                  {reliefGranted.Primary_Relief.Description && (
                    <p className="font-sans text-sm text-green-700 mt-2">
                      {reliefGranted.Primary_Relief.Description}
                    </p>
                  )}
                </div>
                
                {/* Compensation Range */}
                {reliefGranted.Total_Compensation_Range && (
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="font-sans text-xs text-black/50 mb-1">Minimum</p>
                      <p className="font-sans text-sm font-medium">{reliefGranted.Total_Compensation_Range.Minimum || predictionRecord.compensation_minimum}</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg border-2 border-green-200">
                      <p className="font-sans text-xs text-green-700 mb-1">Most Likely</p>
                      <p className="font-sans text-sm font-bold text-green-800">{reliefGranted.Total_Compensation_Range.Most_Likely || predictionRecord.compensation_most_likely}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="font-sans text-xs text-black/50 mb-1">Maximum</p>
                      <p className="font-sans text-sm font-medium">{reliefGranted.Total_Compensation_Range.Maximum || predictionRecord.compensation_maximum}</p>
                    </div>
                  </div>
                )}
                
                {/* Recommended Forum */}
                {(reliefGranted.Recommended_Forum || predictionRecord.recommended_forum) && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="font-sans text-sm text-blue-700">
                      <span className="font-medium">Recommended Forum:</span> {reliefGranted.Recommended_Forum || predictionRecord.recommended_forum}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Applicable Laws */}
            {legalGrounds.Applicable_Sections && legalGrounds.Applicable_Sections.length > 0 && (
              <div className="mb-6 pb-6 border-b border-black/10">
                <h3 className="font-sans text-base font-medium text-black/70 uppercase tracking-wider mb-4">
                  Applicable Laws & Sections
                </h3>
                <div className="space-y-3">
                  {legalGrounds.Applicable_Sections.slice(0, 5).map((section: any, idx: number) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-sans text-sm font-medium text-black">
                        Section {section.Section} - {section.Act}
                      </p>
                      <p className="font-sans text-xs text-black/60 mt-1">{section.Description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {simulationMetadata.Key_Arguments_For_Consumer && simulationMetadata.Key_Arguments_For_Consumer.length > 0 && (
              <div className="mb-6">
                <h3 className="font-sans text-base font-medium text-black/70 uppercase tracking-wider mb-4">
                  Key Arguments for Consumer
                </h3>
                <ul className="list-disc list-inside space-y-2">
                  {simulationMetadata.Key_Arguments_For_Consumer.map((arg: string, idx: number) => (
                    <li key={idx} className="font-sans text-sm text-black/80">{arg}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Judge Signature */}
            <div className="border-t border-black/10 pt-8 mt-8">
              <div className="text-right">
                <p className="font-sans text-sm text-black/50 mb-2">AI Analysis by</p>
                <p className="font-serif text-lg font-medium text-black">Niyam Guru</p>
                <p className="font-sans text-sm text-black/60">AI Legal Prediction System</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-10">
          <Button
            variant="outline"
            size="lg"
            onClick={handleDownload}
            className="w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            Download Prediction
          </Button>
          
          <Button
            variant="primary"
            size="lg"
            onClick={handleNewCase}
            className="w-full sm:w-auto flex items-center justify-center gap-2"
          >
            Start New Case
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Button>
        </div>

        {/* Disclaimer */}
        <div className="mt-10 text-center">
          <p className="font-sans text-xs text-black/40">
            This is a simulated verdict for educational purposes only.
            <br />
            It does not constitute actual legal advice or a binding judgment.
          </p>
        </div>
      </div>
    </div>
  );
};
