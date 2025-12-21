import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/src/components/common/Button';
import { NoiseOverlay } from '@/src/components/common/NoiseOverlay';

interface ComplaintFormData {
  complainantName: string;
  oppositePartyName: string;
  deficiencyType: string;
  grievanceDescription: string;
  purchaseAmount: string;
  compensationAmount: string;
  reliefSought: string;
  productServiceDescription: string;
}

export const VerdictPrediction: React.FC = () => {
  const navigate = useNavigate();
  const [complaintData, setComplaintData] = useState<ComplaintFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [verdict, setVerdict] = useState<string>('');

  useEffect(() => {
    // Load complaint data
    const savedData = localStorage.getItem('consumerComplaintData');
    if (savedData) {
      setComplaintData(JSON.parse(savedData));
    }

    // Simulate loading/processing time
    const timer = setTimeout(() => {
      setIsLoading(false);
      generateVerdict(savedData ? JSON.parse(savedData) : null);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const generateVerdict = (data: ComplaintFormData | null) => {
    // Generate a verdict based on the complaint data
    const complainantName = data?.complainantName || 'the Complainant';
    const oppositePartyName = data?.oppositePartyName || 'the Opposite Party';
    const compensationAmount = data?.compensationAmount 
      ? `₹${Number(data.compensationAmount).toLocaleString('en-IN')}` 
      : 'the claimed amount';
    const deficiencyType = data?.deficiencyType || 'deficiency in service';

    const verdictText = `After careful consideration of all the evidence presented, testimonies heard, and the arguments made by both parties, this Forum hereby rules in FAVOR of ${complainantName}.

It is established that ${oppositePartyName} has been found guilty of ${deficiencyType.toLowerCase()} under the Consumer Protection Act, 2019.

ORDER:

1. ${oppositePartyName} is hereby directed to pay compensation of ${compensationAmount} to ${complainantName} within 30 days from the date of this order.

2. ${oppositePartyName} shall also pay ₹5,000 as litigation costs to the Complainant.

3. In case of non-compliance, an additional interest of 9% per annum shall be levied on the compensation amount from the date of this order until the date of actual payment.

4. ${oppositePartyName} is further directed to rectify the deficiency and ensure such incidents do not recur.

This order is pronounced in the open Forum on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}.`;

    setVerdict(verdictText);
  };

  const handleDownload = () => {
    // Create a text file with the verdict
    const element = document.createElement('a');
    const file = new Blob([verdict], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Verdict_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleNewCase = () => {
    // Clear all stored data
    localStorage.removeItem('consumerComplaintData');
    localStorage.removeItem('consumerComplaintFiles');
    localStorage.removeItem('judgeQASession');
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="relative min-h-screen w-full bg-[#FAFAFA] flex items-center justify-center">
        <NoiseOverlay />
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 border-4 border-black/20 border-t-black rounded-full animate-spin mx-auto mb-6"></div>
          <p className="font-serif text-xl text-black/70">Preparing Final Verdict...</p>
          <p className="font-sans text-sm text-black/50 mt-2">Please wait while the Judge renders the decision</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#FAFAFA]">
      <NoiseOverlay />

      <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl tracking-wide font-semibold flex items-baseline justify-center gap-0.5 mb-4">
            <span className="font-gotu">नियम</span>
            <span className="font-serif">-</span>
            <span className="font-instrument italic">guru</span>
          </h1>
          
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
        <div className="bg-white border border-black/10 rounded-2xl overflow-hidden shadow-sm">
          {/* Card Header */}
          <div className="bg-black text-white px-6 md:px-8 py-6 text-center">
            <p className="font-sans text-sm uppercase tracking-wider text-white/70 mb-2">
              Consumer Disputes Redressal Forum
            </p>
            <h2 className="font-sans text-lg md:text-xl font-medium">
              Final Verdict
            </h2>
          </div>

          {/* Verdict Content */}
          <div className="px-6 md:px-8 py-8">
            {/* Case Info */}
            <div className="flex flex-wrap justify-between gap-4 mb-8 pb-6 border-b border-black/10">
              <div>
                <p className="font-sans text-xs text-black/50 mb-1">Case Number</p>
                <p className="font-sans text-sm font-medium text-black">
                  CC/{new Date().getFullYear()}/{String(Math.floor(Math.random() * 9000) + 1000)}
                </p>
              </div>
              <div>
                <p className="font-sans text-xs text-black/50 mb-1">Date of Judgment</p>
                <p className="font-sans text-sm font-medium text-black">
                  {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div>
                <p className="font-sans text-xs text-black/50 mb-1">Complainant</p>
                <p className="font-sans text-sm font-medium text-black">
                  {complaintData?.complainantName || 'N/A'}
                </p>
              </div>
              <div>
                <p className="font-sans text-xs text-black/50 mb-1">Opposite Party</p>
                <p className="font-sans text-sm font-medium text-black">
                  {complaintData?.oppositePartyName || 'N/A'}
                </p>
              </div>
            </div>

            {/* The Verdict */}
            <div className="mb-8">
              <h3 className="font-sans text-base font-medium text-black/70 uppercase tracking-wider mb-4">
                Final Verdict
              </h3>
              <div className="font-serif text-xl md:text-2xl leading-relaxed text-black whitespace-pre-wrap">
                {verdict}
              </div>
            </div>

            {/* Judge Signature */}
            <div className="border-t border-black/10 pt-8 mt-8">
              <div className="text-right">
                <p className="font-sans text-sm text-black/50 mb-2">Pronounced by</p>
                <p className="font-serif text-lg font-medium text-black">Hon'ble Presiding Officer</p>
                <p className="font-sans text-sm text-black/60">Consumer Disputes Redressal Forum</p>
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
            Download Verdict
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
