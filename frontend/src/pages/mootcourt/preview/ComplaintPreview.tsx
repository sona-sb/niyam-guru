import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/src/components/common/Button';
import { NoiseOverlay } from '@/src/components/common/NoiseOverlay';

interface ComplaintFormData {
  complainantName: string;
  complainantFatherHusbandName: string;
  complainantAddress: string;
  complainantPhone: string;
  complainantEmail: string;
  complainantAge: string;
  complainantOccupation: string;
  oppositePartyName: string;
  oppositePartyAddress: string;
  oppositePartyPhone: string;
  oppositePartyEmail: string;
  oppositePartyDesignation: string;
  forumName: string;
  districtName: string;
  stateName: string;
  complaintNumber: string;
  complaintYear: string;
  productServiceDescription: string;
  purchaseDate: string;
  purchaseAmount: string;
  paymentMode: string;
  invoiceNumber: string;
  grievanceDescription: string;
  deficiencyType: string;
  dateOfDeficiency: string;
  priorComplaintDate: string;
  priorComplaintDetails: string;
  responseReceived: string;
  compensationAmount: string;
  reliefSought: string;
  additionalRelief: string;
  documentsAttached: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  category: string;
}

export const ComplaintPreview: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ComplaintFormData | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  useEffect(() => {
    // Retrieve form data from localStorage
    const savedData = localStorage.getItem('consumerComplaintData');
    const savedFiles = localStorage.getItem('consumerComplaintFiles');
    
    if (savedData) {
      setFormData(JSON.parse(savedData));
    }
    if (savedFiles) {
      setUploadedFiles(JSON.parse(savedFiles));
    }
  }, []);

  const handleEdit = () => {
    navigate('/mootcourt/template');
  };

  const handleSubmit = () => {
    // Handle final submission logic here
    console.log('Submitting complaint:', formData);
    console.log('Attached files:', uploadedFiles);
    // Navigate to judge questions page
    navigate('/mootcourt/questions');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not provided';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: string) => {
    if (!amount) return 'Not provided';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type === 'application/pdf') return '📄';
    if (type.startsWith('video/')) return '🎥';
    if (type.includes('word') || type.includes('document')) return '📝';
    return '📎';
  };

  const sectionClass = 'bg-[#fbf7ef] border border-black/10 rounded-2xl p-6 md:p-8 mb-6';
  const sectionTitleClass = 'font-serif text-xl md:text-2xl text-black mb-6 pb-4 border-b border-black/10';
  const labelClass = 'font-sans text-sm text-black/50 mb-1';
  const valueClass = 'font-sans text-base text-black';
  const gridClass = 'grid grid-cols-1 md:grid-cols-2 gap-6';

  if (!formData) {
    return (
      <div className="relative min-h-screen w-full bg-[#fbf7ef] flex items-center justify-center">
        <NoiseOverlay />
        <div className="relative z-10 text-center">
          <p className="font-sans text-lg text-black/70 mb-4">No complaint data found.</p>
          <Button variant="primary" onClick={() => navigate('/mootcourt/template')}>
            Start New Complaint
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#fbf7ef]">
      <NoiseOverlay />

      <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl tracking-wide font-semibold flex items-baseline justify-center gap-0.5 mb-4">
            <span className="font-gotu">नियम</span>
            <span className="font-serif">-</span>
            <span className="font-instrument italic">guru</span>
          </h1>
          <h2 className="font-serif text-2xl md:text-3xl text-black/80">
            Complaint Preview
          </h2>
          <p className="font-sans text-sm text-black/60 mt-2">
            Please review all details before final submission
          </p>
        </div>

        {/* Alert Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex items-start gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-amber-600 flex-shrink-0 mt-0.5"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <p className="font-sans text-sm text-amber-800">
            Please carefully review all the information below. Click "Edit" to make changes or "Submit Complaint" to proceed.
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="space-y-6">
          {/* Section 1: Case Details */}
          <section className={sectionClass}>
            <h3 className={sectionTitleClass}>
              <span className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-sans">1</span>
                Case Details
              </span>
            </h3>
            
            {/* Forum Details */}
            <div className="mb-6">
              <h4 className="font-serif text-lg text-black mb-4">Forum Details</h4>
              <div className={gridClass}>
                <div>
                  <p className={labelClass}>Consumer Forum</p>
                  <p className={valueClass}>{formData.forumName || 'Not provided'}</p>
                </div>
                <div>
                  <p className={labelClass}>District</p>
                  <p className={valueClass}>{formData.districtName || 'Not provided'}</p>
                </div>
                <div>
                  <p className={labelClass}>State</p>
                  <p className={valueClass}>{formData.stateName || 'Not provided'}</p>
                </div>
                <div>
                  <p className={labelClass}>Complaint Year</p>
                  <p className={valueClass}>{formData.complaintYear || 'Not provided'}</p>
                </div>
              </div>
            </div>

            {/* Transaction Details */}
            <div className="mb-6 pt-6 border-t border-black/10">
              <h4 className="font-serif text-lg text-black mb-4">Transaction Details</h4>
              <div className={gridClass}>
                <div className="md:col-span-2">
                  <p className={labelClass}>Product/Service Description</p>
                  <p className={valueClass}>{formData.productServiceDescription || 'Not provided'}</p>
                </div>
                <div>
                  <p className={labelClass}>Date of Purchase</p>
                  <p className={valueClass}>{formatDate(formData.purchaseDate)}</p>
                </div>
                <div>
                  <p className={labelClass}>Amount Paid</p>
                  <p className={`${valueClass} font-medium`}>{formatCurrency(formData.purchaseAmount)}</p>
                </div>
                <div>
                  <p className={labelClass}>Mode of Payment</p>
                  <p className={valueClass}>{formData.paymentMode || 'Not provided'}</p>
                </div>
                <div>
                  <p className={labelClass}>Invoice/Receipt Number</p>
                  <p className={valueClass}>{formData.invoiceNumber || 'Not provided'}</p>
                </div>
              </div>
            </div>

            {/* Grievance Details */}
            <div className="pt-6 border-t border-black/10">
              <h4 className="font-serif text-lg text-black mb-4">Grievance Details</h4>
              <div className={gridClass}>
                <div>
                  <p className={labelClass}>Type of Deficiency</p>
                  <p className={valueClass}>{formData.deficiencyType || 'Not provided'}</p>
                </div>
                <div>
                  <p className={labelClass}>Date of Deficiency</p>
                  <p className={valueClass}>{formatDate(formData.dateOfDeficiency)}</p>
                </div>
                <div className="md:col-span-2">
                  <p className={labelClass}>Detailed Description of Grievance</p>
                  <p className={`${valueClass} whitespace-pre-wrap`}>{formData.grievanceDescription || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Complainant / Opposite Party */}
          <section className={sectionClass}>
            <h3 className={sectionTitleClass}>
              <span className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-sans">2</span>
                Complainant / Opposite Party
              </span>
            </h3>
            
            {/* Complainant Details */}
            <div className="mb-6">
              <h4 className="font-serif text-lg text-black mb-4">Complainant Details</h4>
              <div className={gridClass}>
                <div>
                  <p className={labelClass}>Full Name</p>
                  <p className={valueClass}>{formData.complainantName || 'Not provided'}</p>
                </div>
                <div>
                  <p className={labelClass}>Father's/Husband's Name</p>
                  <p className={valueClass}>{formData.complainantFatherHusbandName || 'Not provided'}</p>
                </div>
                <div>
                  <p className={labelClass}>Age</p>
                  <p className={valueClass}>{formData.complainantAge ? `${formData.complainantAge} years` : 'Not provided'}</p>
                </div>
                <div>
                  <p className={labelClass}>Occupation</p>
                  <p className={valueClass}>{formData.complainantOccupation || 'Not provided'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className={labelClass}>Address</p>
                  <p className={valueClass}>{formData.complainantAddress || 'Not provided'}</p>
                </div>
                <div>
                  <p className={labelClass}>Phone Number</p>
                  <p className={valueClass}>{formData.complainantPhone || 'Not provided'}</p>
                </div>
                <div>
                  <p className={labelClass}>Email Address</p>
                  <p className={valueClass}>{formData.complainantEmail || 'Not provided'}</p>
                </div>
              </div>
            </div>

            {/* Opposite Party Details */}
            <div className="pt-6 border-t border-black/10">
              <h4 className="font-serif text-lg text-black mb-4">Opposite Party Details</h4>
              <div className={gridClass}>
                <div>
                  <p className={labelClass}>Name/Company Name</p>
                  <p className={valueClass}>{formData.oppositePartyName || 'Not provided'}</p>
                </div>
                <div>
                  <p className={labelClass}>Designation/Position</p>
                  <p className={valueClass}>{formData.oppositePartyDesignation || 'Not provided'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className={labelClass}>Address</p>
                  <p className={valueClass}>{formData.oppositePartyAddress || 'Not provided'}</p>
                </div>
                <div>
                  <p className={labelClass}>Phone Number</p>
                  <p className={valueClass}>{formData.oppositePartyPhone || 'Not provided'}</p>
                </div>
                <div>
                  <p className={labelClass}>Email Address</p>
                  <p className={valueClass}>{formData.oppositePartyEmail || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Additional Complainant */}
          <section className={sectionClass}>
            <h3 className={sectionTitleClass}>
              <span className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-sans">3</span>
                Additional Complainant
              </span>
            </h3>
            <p className="font-sans text-black/50 text-center py-6">
              No additional complainants added
            </p>
          </section>

          {/* Section 4: Additional Opposite Party */}
          <section className={sectionClass}>
            <h3 className={sectionTitleClass}>
              <span className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-sans">4</span>
                Additional Opposite Party
              </span>
            </h3>
            <p className="font-sans text-black/50 text-center py-6">
              No additional opposite parties added
            </p>
          </section>

          {/* Section 5: Document Upload */}
          <section className={sectionClass}>
            <h3 className={sectionTitleClass}>
              <span className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-sans">5</span>
                Document Upload
              </span>
            </h3>
            {uploadedFiles.length > 0 ? (
              <div className="space-y-3">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={file.id || index}
                    className="flex items-center gap-3 p-4 bg-black/5 rounded-xl"
                  >
                    <span className="text-2xl">{getFileIcon(file.type)}</span>
                    <div className="flex-1">
                      <p className="font-sans font-medium text-black text-sm">{file.name}</p>
                      <p className="font-sans text-xs text-black/50">
                        {file.category} • {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-sans text-black/50 text-center py-6">
                No documents uploaded
              </p>
            )}
          </section>

          {/* Section 6: Final Submission & Checkout */}
          <section className={sectionClass}>
            <h3 className={sectionTitleClass}>
              <span className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-sans">6</span>
                Final Submission & Checkout
              </span>
            </h3>
            <div className={gridClass}>
              <div>
                <p className={labelClass}>Compensation Amount Claimed</p>
                <p className={`${valueClass} font-semibold text-lg`}>{formatCurrency(formData.compensationAmount)}</p>
              </div>
              <div>
                <p className={labelClass}>Documents Attached</p>
                <p className={valueClass}>{formData.documentsAttached || 'Not specified'}</p>
              </div>
              <div className="md:col-span-2">
                <p className={labelClass}>Primary Relief Sought</p>
                <p className={`${valueClass} whitespace-pre-wrap`}>{formData.reliefSought || 'Not provided'}</p>
              </div>
              <div className="md:col-span-2">
                <p className={labelClass}>Additional Relief</p>
                <p className={`${valueClass} whitespace-pre-wrap`}>{formData.additionalRelief || 'Not provided'}</p>
              </div>
            </div>
          </section>

          {/* Declaration */}
          <section className="bg-black/5 border border-black/10 rounded-2xl p-6 md:p-8">
            <h3 className="font-sans font-semibold text-black mb-3">Declaration</h3>
            <p className="font-sans text-sm text-black/70 leading-relaxed">
              I hereby declare that the information furnished above is true and correct to the best of my knowledge and belief. 
              I also declare that I have not filed any complaint regarding the same cause of action before any other Consumer Forum/Commission.
            </p>
          </section>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-gradient-to-t from-[#fbf7ef] via-[#fbf7ef] to-transparent pt-8 pb-6 mt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 max-w-4xl mx-auto">
            <Button
              variant="outline"
              size="lg"
              onClick={handleEdit}
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
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
              Edit Details
            </Button>
            
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              Submit Complaint
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
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="font-sans text-xs text-black/50">
            This preview is generated based on the Consumer Protection Act, 2019
          </p>
        </div>
      </div>
    </div>
  );
};
