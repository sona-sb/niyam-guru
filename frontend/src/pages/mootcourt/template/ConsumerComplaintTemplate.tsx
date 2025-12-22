import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/src/components/common/Button';
import { NoiseOverlay } from '@/src/components/common/NoiseOverlay';

interface ComplaintFormData {
  // Complainant Details
  complainantName: string;
  complainantFatherHusbandName: string;
  complainantAddress: string;
  complainantPhone: string;
  complainantEmail: string;
  complainantAge: string;
  complainantOccupation: string;

  // Opposite Party Details
  oppositePartyName: string;
  oppositePartyAddress: string;
  oppositePartyPhone: string;
  oppositePartyEmail: string;
  oppositePartyDesignation: string;

  // Case Details
  forumName: string;
  districtName: string;
  stateName: string;
  complaintNumber: string;
  complaintYear: string;

  // Transaction Details
  productServiceDescription: string;
  purchaseDate: string;
  purchaseAmount: string;
  paymentMode: string;
  invoiceNumber: string;

  // Grievance Details
  grievanceDescription: string;
  deficiencyType: string;
  dateOfDeficiency: string;

  // Prior Communication
  priorComplaintDate: string;
  priorComplaintDetails: string;
  responseReceived: string;

  // Relief Sought
  compensationAmount: string;
  reliefSought: string;
  additionalRelief: string;

  // Supporting Documents
  documentsAttached: string;
}

const initialFormData: ComplaintFormData = {
  complainantName: '',
  complainantFatherHusbandName: '',
  complainantAddress: '',
  complainantPhone: '',
  complainantEmail: '',
  complainantAge: '',
  complainantOccupation: '',
  oppositePartyName: '',
  oppositePartyAddress: '',
  oppositePartyPhone: '',
  oppositePartyEmail: '',
  oppositePartyDesignation: '',
  forumName: 'District Consumer Disputes Redressal Forum',
  districtName: '',
  stateName: '',
  complaintNumber: '',
  complaintYear: new Date().getFullYear().toString(),
  productServiceDescription: '',
  purchaseDate: '',
  purchaseAmount: '',
  paymentMode: '',
  invoiceNumber: '',
  grievanceDescription: '',
  deficiencyType: '',
  dateOfDeficiency: '',
  priorComplaintDate: '',
  priorComplaintDetails: '',
  responseReceived: '',
  compensationAmount: '',
  reliefSought: '',
  additionalRelief: '',
  documentsAttached: '',
};

const deficiencyTypes = [
  'Defective Product',
  'Deficiency in Service',
  'Unfair Trade Practice',
  'Restrictive Trade Practice',
  'Overcharging',
  'Hazardous Goods/Services',
  'Non-delivery of Goods',
  'Delay in Service',
  'Misleading Advertisement',
  'Other',
];

const forumTypes = [
  'District Consumer Disputes Redressal Forum',
  'State Consumer Disputes Redressal Commission',
  'National Consumer Disputes Redressal Commission',
];

const paymentModes = [
  'Cash',
  'Debit Card',
  'Credit Card',
  'UPI',
  'Net Banking',
  'Cheque',
  'Demand Draft',
  'EMI',
  'Other',
];

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  category: string;
  file: File;
}

const evidenceCategories = [
  'Purchase Receipt/Invoice',
  'Warranty Card',
  'Product Photos',
  'Defect Photos/Videos',
  'Communication Records',
  'Bank/Payment Statements',
  'Email Correspondence',
  'Written Complaints',
  'Other Documents',
];

export const ConsumerComplaintTemplate: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ComplaintFormData>(initialFormData);
  const [currentSection, setCurrentSection] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(evidenceCategories[0]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    // Save form data to localStorage
    localStorage.setItem('consumerComplaintData', JSON.stringify(formData));
    // Save uploaded files info (without the actual File objects)
    const filesInfo = uploadedFiles.map(({ id, name, size, type, category }) => ({
      id,
      name,
      size,
      type,
      category,
    }));
    localStorage.setItem('consumerComplaintFiles', JSON.stringify(filesInfo));
    // Navigate to the preview page
    navigate('/mootcourt/preview');
  };

  const sections = [
    { title: 'Case Details', id: 'case-details' },
    { title: 'Complainant / Opposite Party', id: 'complainant-opposite' },
    { title: 'Additional Complainant', id: 'additional-complainant' },
    { title: 'Additional Opposite Party', id: 'additional-opposite' },
    { title: 'Document Upload', id: 'document-upload' },
    { title: 'Final Submission & Checkout', id: 'final-submission' },
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      category: selectedCategory,
      file: file,
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== id));
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

  const inputClass =
    'w-full px-4 py-2.5 bg-white border border-black/20 rounded-lg font-sans text-[15px] text-black placeholder-black/40 focus:outline-none focus:border-black transition-all duration-300';
  const labelClass = 'block font-sans text-sm font-medium text-black mb-2';
  const sectionTitleClass = 'font-serif text-2xl md:text-3xl text-black mb-6';

  return (
    <div className="relative min-h-screen w-full bg-white">
      <NoiseOverlay />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl tracking-wide font-semibold flex items-baseline justify-center gap-0.5 mb-4">
            <span className="font-gotu">नियम</span>
            <span className="font-serif">-</span>
            <span className="font-instrument italic">guru</span>
          </h1>
          <h2 className="font-serif text-2xl md:text-3xl text-black/80">
            Consumer Complaint Filing Form
          </h2>
          <p className="font-sans text-sm text-black/60 mt-2">
            As per the Consumer Protection Act, 2019
          </p>
        </div>

        {/* Section Navigation - Stepper */}
        <div className="mb-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-black/60 mb-8">
            <span className="text-gray-500 cursor-pointer hover:underline">Dashboard</span>
            <span>{'>'}</span>
            <span className="font-medium text-black">File New Case</span>
          </div>
          
          {/* Stepper */}
          <div className="relative flex items-start justify-between">
            {/* Connector Line - Single straight line behind all circles */}
            <div className="absolute top-5 left-0 right-0 flex items-center px-[60px]">
              <div className="w-full h-[2px] bg-gray-300 relative">
                <div 
                  className="absolute top-0 left-0 h-full bg-black transition-all duration-300"
                  style={{ width: `${(currentSection / (sections.length - 1)) * 100}%` }}
                />
              </div>
            </div>
            
            {sections.map((section, index) => (
              <div key={section.id} className="flex flex-col items-center relative z-10" style={{ width: `${100 / sections.length}%` }}>
                {/* Step Circle */}
                <button
                  onClick={() => setCurrentSection(index)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    index <= currentSection
                      ? 'bg-black text-white'
                      : 'bg-white border-2 border-gray-300 text-gray-500'
                  }`}
                >
                  {index + 1}
                </button>
                
                {/* Step Title */}
                <span className={`mt-3 text-xs text-center max-w-[100px] leading-tight ${
                  index === currentSection ? 'text-black font-medium' : 'text-gray-500'
                }`}>
                  {section.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form className="space-y-8">
          {/* Case Details Section */}
          {currentSection === 0 && (
            <div className="bg-[#fbf7ef] border border-black/10 rounded-2xl p-8">
              <h3 className={sectionTitleClass}>Case Details</h3>
              <p className="font-sans text-sm text-black/60 mb-6">
                Select the appropriate consumer forum and provide transaction details.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className={labelClass}>Consumer Forum Type *</label>
                  <select
                    name="forumName"
                    value={formData.forumName}
                    onChange={handleInputChange}
                    className={inputClass}
                    required
                  >
                    {forumTypes.map((forum) => (
                      <option key={forum} value={forum}>
                        {forum}
                      </option>
                    ))}
                  </select>
                  <p className="font-sans text-xs text-black/50 mt-1">
                    District Forum: Up to ₹1 Crore | State Commission: ₹1-10 Crore | National Commission: Above ₹10 Crore
                  </p>
                </div>
                <div>
                  <label className={labelClass}>District *</label>
                  <input
                    type="text"
                    name="districtName"
                    value={formData.districtName}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="Enter district name"
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>State *</label>
                  <input
                    type="text"
                    name="stateName"
                    value={formData.stateName}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="Enter state name"
                    required
                  />
                </div>
                
                {/* Transaction Details */}
                <div className="md:col-span-2 mt-4 pt-6 border-t border-black/10">
                  <h4 className="font-serif text-xl text-black mb-4">Transaction Details</h4>
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Product/Service Description *</label>
                  <textarea
                    name="productServiceDescription"
                    value={formData.productServiceDescription}
                    onChange={handleInputChange}
                    className={`${inputClass} min-h-[100px]`}
                    placeholder="Describe the product or service in detail (including brand, model, specifications)"
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Date of Purchase/Service *</label>
                  <input
                    type="date"
                    name="purchaseDate"
                    value={formData.purchaseDate}
                    onChange={handleInputChange}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Amount Paid (₹) *</label>
                  <input
                    type="number"
                    name="purchaseAmount"
                    value={formData.purchaseAmount}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="Enter amount in rupees"
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Mode of Payment *</label>
                  <select
                    name="paymentMode"
                    value={formData.paymentMode}
                    onChange={handleInputChange}
                    className={inputClass}
                    required
                  >
                    <option value="">Select payment mode</option>
                    {paymentModes.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Invoice/Receipt Number</label>
                  <input
                    type="text"
                    name="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="Enter invoice/bill number"
                  />
                </div>

                {/* Grievance Details */}
                <div className="md:col-span-2 mt-4 pt-6 border-t border-black/10">
                  <h4 className="font-serif text-xl text-black mb-4">Grievance Details</h4>
                </div>
                <div>
                  <label className={labelClass}>Type of Deficiency *</label>
                  <select
                    name="deficiencyType"
                    value={formData.deficiencyType}
                    onChange={handleInputChange}
                    className={inputClass}
                    required
                  >
                    <option value="">Select deficiency type</option>
                    {deficiencyTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Date of Deficiency *</label>
                  <input
                    type="date"
                    name="dateOfDeficiency"
                    value={formData.dateOfDeficiency}
                    onChange={handleInputChange}
                    className={inputClass}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Detailed Description of Grievance *</label>
                  <textarea
                    name="grievanceDescription"
                    value={formData.grievanceDescription}
                    onChange={handleInputChange}
                    className={`${inputClass} min-h-[150px]`}
                    placeholder="Describe in detail what went wrong, when it happened, and how it affected you."
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Complainant / Opposite Party Section */}
          {currentSection === 1 && (
            <div className="bg-[#fbf7ef] border border-black/10 rounded-2xl p-8">
              <h3 className={sectionTitleClass}>Complainant / Opposite Party</h3>
              
              {/* Complainant Details */}
              <div className="mb-8">
                <h4 className="font-serif text-xl text-black mb-4">Complainant Details</h4>
                <p className="font-sans text-sm text-black/60 mb-6">
                  Enter the complete details of the person filing the complaint.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Full Name *</label>
                    <input
                      type="text"
                      name="complainantName"
                      value={formData.complainantName}
                      onChange={handleInputChange}
                      className={inputClass}
                      placeholder="Enter your full legal name"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Father's/Husband's Name *</label>
                    <input
                      type="text"
                      name="complainantFatherHusbandName"
                      value={formData.complainantFatherHusbandName}
                      onChange={handleInputChange}
                      className={inputClass}
                      placeholder="S/o, D/o, or W/o"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Age *</label>
                    <input
                      type="number"
                      name="complainantAge"
                      value={formData.complainantAge}
                      onChange={handleInputChange}
                      className={inputClass}
                      placeholder="Enter age"
                      min="18"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Occupation</label>
                    <input
                      type="text"
                      name="complainantOccupation"
                      value={formData.complainantOccupation}
                      onChange={handleInputChange}
                      className={inputClass}
                      placeholder="Enter occupation"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Complete Address *</label>
                    <textarea
                      name="complainantAddress"
                      value={formData.complainantAddress}
                      onChange={handleInputChange}
                      className={`${inputClass} min-h-[100px]`}
                      placeholder="Enter complete address with PIN code"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Phone Number *</label>
                    <input
                      type="tel"
                      name="complainantPhone"
                      value={formData.complainantPhone}
                      onChange={handleInputChange}
                      className={inputClass}
                      placeholder="+91 XXXXX XXXXX"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Email Address *</label>
                    <input
                      type="email"
                      name="complainantEmail"
                      value={formData.complainantEmail}
                      onChange={handleInputChange}
                      className={inputClass}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Opposite Party Details */}
              <div className="pt-6 border-t border-black/10">
                <h4 className="font-serif text-xl text-black mb-4">Opposite Party Details</h4>
                <p className="font-sans text-sm text-black/60 mb-6">
                  Enter the complete details of the seller/service provider against whom the complaint is being filed.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Name/Company Name *</label>
                    <input
                      type="text"
                      name="oppositePartyName"
                      value={formData.oppositePartyName}
                      onChange={handleInputChange}
                      className={inputClass}
                      placeholder="Enter company/individual name"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Designation/Position</label>
                    <input
                      type="text"
                      name="oppositePartyDesignation"
                      value={formData.oppositePartyDesignation}
                      onChange={handleInputChange}
                      className={inputClass}
                      placeholder="e.g., Proprietor, Manager, Director"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Complete Address *</label>
                    <textarea
                      name="oppositePartyAddress"
                      value={formData.oppositePartyAddress}
                      onChange={handleInputChange}
                      className={`${inputClass} min-h-[100px]`}
                      placeholder="Enter complete registered/business address"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Phone Number</label>
                    <input
                      type="tel"
                      name="oppositePartyPhone"
                      value={formData.oppositePartyPhone}
                      onChange={handleInputChange}
                      className={inputClass}
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Email Address</label>
                    <input
                      type="email"
                      name="oppositePartyEmail"
                      value={formData.oppositePartyEmail}
                      onChange={handleInputChange}
                      className={inputClass}
                      placeholder="company@email.com"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Additional Complainant Section */}
          {currentSection === 2 && (
            <div className="bg-[#fbf7ef] border border-black/10 rounded-2xl p-8">
              <h3 className={sectionTitleClass}>Additional Complainant</h3>
              <p className="font-sans text-sm text-black/60 mb-6">
                If there are multiple complainants, add their details here. This section is optional.
              </p>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-black/40"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" x2="19" y1="8" y2="14" />
                    <line x1="22" x2="16" y1="11" y2="11" />
                  </svg>
                </div>
                <p className="font-sans text-black/60 mb-4">No additional complainants added yet</p>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white hover:bg-black/80 rounded-lg transition-all duration-300"
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
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 12h8" />
                    <path d="M12 8v8" />
                  </svg>
                  <span className="font-sans font-medium text-sm">Add Complainant</span>
                </button>
              </div>
            </div>
          )}

          {/* Additional Opposite Party Section */}
          {currentSection === 3 && (
            <div className="bg-[#fbf7ef] border border-black/10 rounded-2xl p-8">
              <h3 className={sectionTitleClass}>Additional Opposite Party</h3>
              <p className="font-sans text-sm text-black/60 mb-6">
                If there are multiple opposite parties, add their details here. This section is optional.
              </p>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-black/40"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" x2="19" y1="8" y2="14" />
                    <line x1="22" x2="16" y1="11" y2="11" />
                  </svg>
                </div>
                <p className="font-sans text-black/60 mb-4">No additional opposite parties added yet</p>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white hover:bg-black/80 rounded-lg transition-all duration-300"
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
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 12h8" />
                    <path d="M12 8v8" />
                  </svg>
                  <span className="font-sans font-medium text-sm">Add Opposite Party</span>
                </button>
              </div>
            </div>
          )}

          {/* Document Upload Section */}
          {currentSection === 4 && (
            <div className="bg-[#fbf7ef] border border-black/10 rounded-2xl p-8">
              <h3 className={sectionTitleClass}>Document Upload</h3>
              <p className="font-sans text-sm text-black/60 mb-6">
                Upload supporting documents such as receipts, invoices, warranty cards, photographs, or any other evidence related to your complaint.
              </p>

              {/* Category Selection */}
              <div className="mb-6">
                <label className={labelClass}>Document Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={inputClass}
                >
                  {evidenceCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Drag and Drop Zone */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                  dragActive
                    ? 'border-black bg-black/5'
                    : 'border-black/20 hover:border-black/40'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  multiple
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-black/60"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" x2="12" y1="3" y2="15" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-sans font-medium text-black">
                      Drag & drop files here
                    </p>
                    <p className="font-sans text-sm text-black/50 mt-1">
                      or click to browse from your device
                    </p>
                  </div>
                  <p className="font-sans text-xs text-black/40 mt-2">
                    Supported: Images, PDF, Word, Excel, Text (Max 10MB per file)
                  </p>
                </div>
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="mt-8">
                  <h4 className="font-sans font-semibold text-black mb-4">
                    Uploaded Documents ({uploadedFiles.length})
                  </h4>
                  <div className="space-y-3">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-4 bg-black/5 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getFileIcon(file.type)}</span>
                          <div>
                            <p className="font-sans font-medium text-black text-sm">
                              {file.name}
                            </p>
                            <p className="font-sans text-xs text-black/50">
                              {file.category} • {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="p-2 hover:bg-black/10 rounded-lg transition-colors"
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
                            className="text-black/60"
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            <line x1="10" x2="10" y1="11" y2="17" />
                            <line x1="14" x2="14" y1="11" y2="17" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add More Evidence Button with Category Selection */}
                  <div className="mt-6 p-4 bg-black/5 rounded-xl border border-dashed border-black/20">
                    <p className="font-sans text-sm text-black/60 mb-3">Add more evidence:</p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="flex-1">
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className={`${inputClass} !py-2.5`}
                        >
                          {evidenceCategories.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>
                      <label className="relative inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-white hover:bg-black/80 rounded-lg cursor-pointer transition-all duration-300">
                        <input
                          type="file"
                          multiple
                          onChange={handleFileInput}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                        />
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
                          <circle cx="12" cy="12" r="10" />
                          <path d="M8 12h8" />
                          <path d="M12 8v8" />
                        </svg>
                        <span className="font-sans font-medium text-sm whitespace-nowrap">
                          Add Evidence
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Evidence Tips */}
              <div className="mt-8 p-6 bg-amber-50 border border-amber-200 rounded-xl">
                <h4 className="font-sans font-semibold text-amber-800 mb-3 flex items-center gap-2">
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
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                  Tips for Evidence
                </h4>
                <ul className="font-sans text-sm text-amber-700 space-y-2">
                  <li>• Keep original copies of all documents safe</li>
                  <li>• Upload clear, legible scans or photographs</li>
                  <li>• Include date-stamped communications where possible</li>
                  <li>• Bank statements should highlight relevant transactions</li>
                  <li>• Photographs should clearly show the defect or issue</li>
                </ul>
              </div>
            </div>
          )}

          {/* Final Submission & Checkout Section */}
          {currentSection === 5 && (
            <div className="bg-[#fbf7ef] border border-black/10 rounded-2xl p-8">
              <h3 className={sectionTitleClass}>Final Submission & Checkout</h3>
              <p className="font-sans text-sm text-black/60 mb-6">
                Specify the compensation and relief you are seeking from the Consumer Forum.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Compensation Amount (₹) *</label>
                  <input
                    type="number"
                    name="compensationAmount"
                    value={formData.compensationAmount}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="Total compensation claimed"
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Documents Attached</label>
                  <input
                    type="text"
                    name="documentsAttached"
                    value={formData.documentsAttached}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="e.g., Invoice, Warranty Card, Photographs"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Primary Relief Sought *</label>
                  <textarea
                    name="reliefSought"
                    value={formData.reliefSought}
                    onChange={handleInputChange}
                    className={`${inputClass} min-h-[100px]`}
                    placeholder="e.g., Refund of amount paid, Replacement of defective product, Compensation for mental agony and harassment, Cost of litigation"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Additional Relief</label>
                  <textarea
                    name="additionalRelief"
                    value={formData.additionalRelief}
                    onChange={handleInputChange}
                    className={`${inputClass} min-h-[100px]`}
                    placeholder="Any other relief you wish to claim"
                  />
                </div>
              </div>

              {/* Declaration */}
              <div className="mt-8 p-6 bg-black/5 rounded-xl">
                <h4 className="font-sans font-semibold text-black mb-3">Declaration</h4>
                <p className="font-sans text-sm text-black/70 leading-relaxed">
                  I hereby declare that the information furnished above is true and correct to the best of my knowledge and belief. 
                  I also declare that I have not filed any complaint regarding the same cause of action before any other Consumer Forum/Commission.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-6">
            <button
              type="button"
              onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
              className={`px-6 py-2.5 rounded-lg font-sans font-medium transition-all duration-300 ${
                currentSection === 0
                  ? 'bg-black/10 text-black/40 cursor-not-allowed'
                  : 'bg-black/5 text-black hover:bg-black/10'
              }`}
              disabled={currentSection === 0}
            >
              Previous
            </button>

            <div className="flex gap-4">
              {currentSection < sections.length - 1 ? (
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={() => setCurrentSection(currentSection + 1)}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={handleNext}
                  className="flex items-center gap-2"
                >
                  Next
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
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Button>
              )}
            </div>
          </div>
        </form>

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <p className="font-sans text-xs text-black/50">
            This form is based on the Consumer Protection Act, 2019 and the Consumer Protection Rules, 2020.
            <br />
            For official filings, please visit{' '}
            <a
              href="https://edaakhil.nic.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-black/70 underline hover:text-black"
            >
              e-Daakhil Portal
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
