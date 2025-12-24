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
  paidAsConsideration: string;
  claimConsideration: string;
  dateOfCauseOfAction: string;
  stateOfCauseOfAction: string;
  districtOfCauseOfAction: string;
  caseCategory: string;
  subCategory: string;

  // Legacy fields (keeping for compatibility)
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
  reliefSought: string;

  // Declaration
  declarationAccepted: boolean;

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
  paidAsConsideration: '',
  claimConsideration: '',
  dateOfCauseOfAction: '',
  stateOfCauseOfAction: '',
  districtOfCauseOfAction: '',
  caseCategory: '',
  subCategory: '',
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
  reliefSought: '',
  declarationAccepted: false,
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

const indianStates = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

const caseCategories = [
  'CONSUMER DURABLES',
  'BANKING & FINANCE',
  'INSURANCE',
  'TELECOM',
  'HOUSING & REAL ESTATE',
  'EDUCATION',
  'HEALTHCARE',
  'E-COMMERCE',
  'TRAVEL & TOURISM',
  'AUTOMOBILE',
  'ELECTRICITY',
  'FOOD & BEVERAGES',
  'OTHER SERVICES',
];

const subCategories: Record<string, string[]> = {
  'CONSUMER DURABLES': ['Electronics', 'Home Appliances', 'Mobile Phones', 'Computers & Laptops', 'Furniture', 'Other'],
  'BANKING & FINANCE': ['Loans', 'Credit Cards', 'Deposits', 'ATM/Debit Cards', 'Net Banking', 'Other'],
  'INSURANCE': ['Life Insurance', 'Health Insurance', 'Motor Insurance', 'Property Insurance', 'Travel Insurance', 'Other'],
  'TELECOM': ['Mobile Services', 'Broadband', 'DTH', 'Landline', 'Other'],
  'HOUSING & REAL ESTATE': ['Builder/Developer', 'Housing Finance', 'Property Disputes', 'Other'],
  'EDUCATION': ['Schools', 'Colleges/Universities', 'Coaching Institutes', 'Online Education', 'Other'],
  'HEALTHCARE': ['Hospitals', 'Clinics', 'Diagnostic Centers', 'Pharmacies', 'Other'],
  'E-COMMERCE': ['Online Shopping', 'Food Delivery', 'Cab Services', 'Other Online Services', 'Other'],
  'TRAVEL & TOURISM': ['Airlines', 'Railways', 'Hotels', 'Travel Agencies', 'Other'],
  'AUTOMOBILE': ['Car Dealers', 'Two-Wheeler Dealers', 'Service Centers', 'Spare Parts', 'Other'],
  'ELECTRICITY': ['Billing Disputes', 'Connection Issues', 'Service Quality', 'Other'],
  'FOOD & BEVERAGES': ['Restaurants', 'Packaged Foods', 'Beverages', 'Other'],
  'OTHER SERVICES': ['Courier Services', 'Laundry Services', 'Repair Services', 'Other'],
};

// Helper function to convert number to Indian words
const numberToIndianWords = (num: number): string => {
  if (num === 0) return 'Zero';
  if (isNaN(num)) return '';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanThousand = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
  };

  let result = '';
  
  if (num >= 10000000) {
    result += convertLessThanThousand(Math.floor(num / 10000000)) + ' Crore ';
    num %= 10000000;
  }
  if (num >= 100000) {
    result += convertLessThanThousand(Math.floor(num / 100000)) + ' Lakh ';
    num %= 100000;
  }
  if (num >= 1000) {
    result += convertLessThanThousand(Math.floor(num / 1000)) + ' Thousand ';
    num %= 1000;
  }
  if (num > 0) {
    result += convertLessThanThousand(num);
  }

  return result.trim() + ' Rupees';
};

// Helper function to format number in Indian format (with commas)
const formatIndianNumber = (num: string): string => {
  const number = num.replace(/,/g, '');
  if (!number || isNaN(Number(number))) return num;
  
  const parts = number.split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1] ? '.' + parts[1] : '';
  
  // Indian numbering system: last 3 digits, then groups of 2
  const lastThree = integerPart.slice(-3);
  const otherDigits = integerPart.slice(0, -3);
  
  if (otherDigits) {
    const formatted = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return formatted + ',' + lastThree + decimalPart;
  }
  return lastThree + decimalPart;
};

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

  const handleDrop = (e: React.DragEvent, category?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files, category);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, category?: string) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files, category);
    }
  };

  // Categories that allow only single file upload
  const singleUploadCategories = ['Index', 'Proforma', 'Synopsis', 'Memo of Parties', 'Complaint Draft', 'Vakalatnama'];

  const handleFiles = (files: FileList, category?: string) => {
    const targetCategory = category || selectedCategory;
    
    // For single upload categories, only take the first file and replace existing
    if (singleUploadCategories.includes(targetCategory)) {
      const file = files[0];
      const newFile: UploadedFile = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        category: targetCategory,
        file: file,
      };
      // Replace any existing file in this category
      setUploadedFiles((prev) => [
        ...prev.filter(f => f.category !== targetCategory),
        newFile
      ]);
    } else {
      // For multiple upload categories (like Annexures), add all files
      const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        category: targetCategory,
        file: file,
      }));
      setUploadedFiles((prev) => [...prev, ...newFiles]);
    }
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
    'w-full px-4 py-2.5 bg-white border border-[#EBEBEB] rounded-xl font-sans text-[15px] text-black/60 placeholder-black/40 focus:outline-none focus:border-black/50 transition-all duration-300';
  const labelClass = 'block font-sans text-[10px] uppercase tracking-widest font-bold text-black/70 mb-2';
  const sectionTitleClass = 'font-semibold text-2xl md:text-2xl text-black mb-6';

  return (
    <div className="relative min-h-screen w-full bg-[#fbf7ef]">
      <NoiseOverlay />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-left mb-12">
          <h2 className="font-serif text-4xl md:text-5xl text-black">
            Consumer Complaint <span className="italic font-vesper">Filing Form</span>
          </h2>
          <p className="font-medium text-sm text-black/80 mt-2">
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
            <div className="absolute top-5 left-0 right-0 flex items-center px-10">
              <div className="w-full h-[2px] bg-gray-300 relative">
                <div 
                  className="absolute top-0 left-0 h-full bg-black transition-all duration-300"
                  style={{ width: `${(currentSection / (sections.length - 1)) * 100}%` }}
                />
              </div>
            </div>
            
            {sections.map((section, index) => (
              <div key={section.id} className="flex flex-col items-center relative z-10 w-20">
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
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-xl text-gray-900 mb-8">Case Details</h3>
              
              {/* Row 1: Paid as consideration & Claim Consideration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Paid as consideration */}
                <div className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      name="paidAsConsideration"
                      value={formData.paidAsConsideration}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setFormData(prev => ({ ...prev, paidAsConsideration: value }));
                      }}
                      className="peer w-full px-4 py-4 bg-white border border-gray-300 rounded text-gray-900 placeholder-transparent focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter amount"
                      required
                    />
                    <label className="absolute left-3 -top-2.5 bg-white px-1 text-xs text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-blue-500">
                      Paid as consideration*
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1.5">
                    <span className="inline-flex items-center justify-center w-4 h-4 bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold">i</span>
                    Enter number value that you've paid for service
                  </p>
                  {formData.paidAsConsideration && (
                    <p className="text-xs text-green-600 font-medium mt-1">
                      {numberToIndianWords(parseInt(formData.paidAsConsideration))}
                    </p>
                  )}
                </div>

                {/* Claim Consideration */}
                <div className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      name="claimConsideration"
                      value={formData.claimConsideration}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setFormData(prev => ({ ...prev, claimConsideration: value }));
                      }}
                      className="peer w-full px-4 py-4 bg-white border border-gray-300 rounded text-gray-900 placeholder-transparent focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter claim amount"
                    />
                    <label className="absolute left-3 -top-2.5 bg-white px-1 text-xs text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-blue-500">
                      Claim Consideration
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1.5">
                    <span className="inline-flex items-center justify-center w-4 h-4 bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold">i</span>
                    Define your exact claim amount in numbers
                  </p>
                  {formData.claimConsideration && (
                    <p className="text-xs text-green-600 font-medium mt-1">
                      {numberToIndianWords(parseInt(formData.claimConsideration))}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 2: Date, State, District - 3 columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Date of Cause of Action */}
                <div className="relative">
                  <div className="relative">
                    <input
                      type="date"
                      name="dateOfCauseOfAction"
                      value={formData.dateOfCauseOfAction}
                      onChange={handleInputChange}
                      className="peer w-full px-4 py-4 bg-white border border-gray-300 rounded text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <label className="absolute left-3 -top-2.5 bg-white px-1 text-xs text-gray-500">
                      Date of Cause of Action
                    </label>
                  </div>
                </div>

                {/* State of Cause of Action */}
                <div className="relative">
                  <div className="relative">
                    <select
                      name="stateOfCauseOfAction"
                      value={formData.stateOfCauseOfAction}
                      onChange={handleInputChange}
                      className="peer w-full px-4 py-4 bg-white border border-gray-300 rounded text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
                      required
                    >
                      <option value="">State of Cause of Action*</option>
                      {indianStates.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                    <label className="absolute left-3 -top-2.5 bg-white px-1 text-xs text-gray-500">
                      State of Cause of Action*
                    </label>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* District of Cause of Action - Text Input */}
                <div className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      name="districtOfCauseOfAction"
                      value={formData.districtOfCauseOfAction}
                      onChange={handleInputChange}
                      className="peer w-full px-4 py-4 bg-white border border-gray-300 rounded text-gray-900 placeholder-transparent focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="District of Cause of Action*"
                      required
                    />
                    <label className="absolute left-3 -top-2.5 bg-white px-1 text-xs text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-blue-500">
                      District of Cause of Action*
                    </label>
                  </div>
                </div>
              </div>

              {/* Row 3: Case Category & Sub Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Case Category */}
                <div className="relative">
                  <div className="relative">
                    <select
                      name="caseCategory"
                      value={formData.caseCategory}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData(prev => ({ ...prev, caseCategory: value, subCategory: '' }));
                      }}
                      className={`peer w-full px-4 py-4 bg-white border rounded text-gray-900 focus:outline-none appearance-none cursor-pointer ${
                        formData.caseCategory 
                          ? 'border-green-500 focus:border-green-500 focus:ring-1 focus:ring-green-500' 
                          : 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      }`}
                      required
                    >
                      <option value="">Case Category*</option>
                      {caseCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <label className={`absolute left-3 -top-2.5 bg-white px-1 text-xs ${
                      formData.caseCategory ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      Case Category*
                    </label>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {formData.caseCategory && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, caseCategory: '', subCategory: '' }))}
                          className="text-gray-400 hover:text-gray-600 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      <svg className="w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Sub Category */}
                <div className="relative">
                  <div className="relative">
                    <select
                      name="subCategory"
                      value={formData.subCategory}
                      onChange={handleInputChange}
                      className="peer w-full px-4 py-4 bg-white border border-gray-300 rounded text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer disabled:bg-gray-50 disabled:cursor-not-allowed"
                      disabled={!formData.caseCategory}
                      required
                    >
                      <option value="">Sub Category*</option>
                      {formData.caseCategory && subCategories[formData.caseCategory]?.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                    <label className="absolute left-3 -top-2.5 bg-white px-1 text-xs text-gray-500">
                      Sub Category*
                    </label>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Complainant / Opposite Party Section */}
          {currentSection === 1 && (
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-xl text-gray-900 mb-6">Complainant / Opposite Party</h3>
              
              {/* Complainant Details */}
              <div className="mb-8">
                <h4 className="font-semibold text-xl text-gray-900 mb-4">Complainant Details</h4>
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
              <div className="pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-xl text-gray-900 mb-4">Opposite Party Details</h4>
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
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-xl text-gray-900 mb-2">Additional Complainant</h3>
              <p className="text-sm text-gray-500 mb-6">
                If there are multiple complainants, add their details here. This section is optional.
              </p>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
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
                    className="text-gray-400"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" x2="19" y1="8" y2="14" />
                    <line x1="22" x2="16" y1="11" y2="11" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 mb-4">No additional complainants added yet</p>
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
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-xl text-gray-900 mb-2">Additional Opposite Party</h3>
              <p className="text-sm text-gray-500 mb-6">
                If there are multiple opposite parties, add their details here. This section is optional.
              </p>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
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
                    className="text-gray-400"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" x2="19" y1="8" y2="14" />
                    <line x1="22" x2="16" y1="11" y2="11" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 mb-4">No additional opposite parties added yet</p>
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
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-xl text-gray-900 mb-2">Document Upload</h3>
              <p className="text-sm text-gray-500 mb-8">
                Upload the following mandatory documents to proceed with your complaint filing.
              </p>

              {/* Mandatory Documents Section */}
              <div className="space-y-6 mb-10">
                {/* 1. Index */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 bg-black text-white text-xs font-bold rounded-full">1</span>
                      <h4 className="font-medium text-gray-900">Index</h4>
                      <span className="text-red-500 text-sm">*</span>
                    </div>
                    {uploadedFiles.find(f => f.category === 'Index') && (
                      <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Uploaded
                      </span>
                    )}
                  </div>
                  <div
                    className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={(e) => handleDrop(e, 'Index')}
                  >
                    <input
                      type="file"
                      onChange={(e) => handleFileInput(e, 'Index')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".pdf"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm text-gray-600">
                        Drag and Drop Files Here or Click to upload (pdf only).
                        <span className="text-gray-400">File size should not exceed 10 MB.</span>
                      </p>
                    </div>
                  </div>
                  {uploadedFiles.filter(f => f.category === 'Index').map(file => (
                    <div key={file.id} className="flex items-center justify-between mt-3 p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">📄 {file.name}</span>
                      <button type="button" onClick={() => removeFile(file.id)} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
                    </div>
                  ))}
                </div>

                {/* 2. Proforma for Filing Consumer Complaint */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 bg-black text-white text-xs font-bold rounded-full">2</span>
                      <h4 className="font-medium text-gray-900">Proforma for Filing Consumer Complaint</h4>
                      <span className="text-red-500 text-sm">*</span>
                    </div>
                    {uploadedFiles.find(f => f.category === 'Proforma') && (
                      <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Uploaded
                      </span>
                    )}
                  </div>
                  <div
                    className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={(e) => handleDrop(e, 'Proforma')}
                  >
                    <input
                      type="file"
                      onChange={(e) => handleFileInput(e, 'Proforma')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".pdf"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm text-gray-600">
                        Drag and Drop Files Here or Click to upload (pdf only).
                        <span className="text-gray-400">File size should not exceed 10 MB.</span>
                      </p>
                    </div>
                  </div>
                  {uploadedFiles.filter(f => f.category === 'Proforma').map(file => (
                    <div key={file.id} className="flex items-center justify-between mt-3 p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">📄 {file.name}</span>
                      <button type="button" onClick={() => removeFile(file.id)} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
                    </div>
                  ))}
                </div>

                {/* 3. Synopsis with List of Dates & Events */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 bg-black text-white text-xs font-bold rounded-full">3</span>
                      <h4 className="font-medium text-gray-900">Synopsis with List of Dates & Events</h4>
                      <span className="text-red-500 text-sm">*</span>
                    </div>
                    {uploadedFiles.find(f => f.category === 'Synopsis') && (
                      <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Uploaded
                      </span>
                    )}
                  </div>
                  <div
                    className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={(e) => handleDrop(e, 'Synopsis')}
                  >
                    <input
                      type="file"
                      onChange={(e) => handleFileInput(e, 'Synopsis')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".pdf"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm text-gray-600">
                        Drag and Drop Files Here or Click to upload (pdf only).
                        <span className="text-gray-400">File size should not exceed 10 MB.</span>
                      </p>
                    </div>
                  </div>
                  {uploadedFiles.filter(f => f.category === 'Synopsis').map(file => (
                    <div key={file.id} className="flex items-center justify-between mt-3 p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">📄 {file.name}</span>
                      <button type="button" onClick={() => removeFile(file.id)} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
                    </div>
                  ))}
                </div>

                {/* 4. Memo of Parties */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 bg-black text-white text-xs font-bold rounded-full">4</span>
                      <h4 className="font-medium text-gray-900">Memo of Parties</h4>
                      <span className="text-red-500 text-sm">*</span>
                    </div>
                    {uploadedFiles.find(f => f.category === 'Memo of Parties') && (
                      <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Uploaded
                      </span>
                    )}
                  </div>
                  <div
                    className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={(e) => handleDrop(e, 'Memo of Parties')}
                  >
                    <input
                      type="file"
                      onChange={(e) => handleFileInput(e, 'Memo of Parties')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".pdf"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm text-gray-600">
                        Drag and Drop Files Here or Click to upload (pdf only).
                        <span className="text-gray-400">File size should not exceed 10 MB.</span>
                      </p>
                    </div>
                  </div>
                  {uploadedFiles.filter(f => f.category === 'Memo of Parties').map(file => (
                    <div key={file.id} className="flex items-center justify-between mt-3 p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">📄 {file.name}</span>
                      <button type="button" onClick={() => removeFile(file.id)} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
                    </div>
                  ))}
                </div>

                {/* 5. Consumer Complaint Draft with Notarized Affidavit */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 bg-black text-white text-xs font-bold rounded-full">5</span>
                      <h4 className="font-medium text-gray-900">Consumer Complaint Draft with Notarized Affidavit</h4>
                      <span className="text-red-500 text-sm">*</span>
                    </div>
                    {uploadedFiles.find(f => f.category === 'Complaint Draft') && (
                      <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Uploaded
                      </span>
                    )}
                  </div>
                  <div
                    className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={(e) => handleDrop(e, 'Complaint Draft')}
                  >
                    <input
                      type="file"
                      onChange={(e) => handleFileInput(e, 'Complaint Draft')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".pdf"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm text-gray-600">
                        Drag and Drop Files Here or Click to upload (pdf only).
                        <span className="text-gray-400">File size should not exceed 10 MB.</span>
                      </p>
                    </div>
                  </div>
                  {uploadedFiles.filter(f => f.category === 'Complaint Draft').map(file => (
                    <div key={file.id} className="flex items-center justify-between mt-3 p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">📄 {file.name}</span>
                      <button type="button" onClick={() => removeFile(file.id)} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Documents Section */}
              <div className="border-t border-gray-200 pt-8 mb-8">
                <h4 className="font-semibold text-lg text-gray-900 mb-4">Additional Documents</h4>
                <div className="mt-4">
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-black hover:bg-black/80 text-white font-medium text-sm rounded-lg cursor-pointer transition-colors">
                    <input
                      type="file"
                      multiple
                      onChange={(e) => handleFileInput(e, 'Annexures')}
                      className="hidden"
                      accept=".pdf,image/*,.doc,.docx"
                    />
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    ADD ANNEXURES / DOCUMENTS
                  </label>
                </div>
                {uploadedFiles.filter(f => f.category === 'Annexures').length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadedFiles.filter(f => f.category === 'Annexures').map(file => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">📄 {file.name} ({formatFileSize(file.size)})</span>
                        <button type="button" onClick={() => removeFile(file.id)} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Vakalatnama Section */}
              <div className="border-t border-gray-200 pt-8">
                <h4 className="font-semibold text-lg text-gray-900 italic mb-4">Vakalatnama</h4>
                <div
                  className="relative border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={(e) => handleDrop(e, 'Vakalatnama')}
                >
                  <input
                    type="file"
                    onChange={(e) => handleFileInput(e, 'Vakalatnama')}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf"
                  />
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-gray-600">
                      Drag and Drop Files Here or Click to upload (pdf only).<span className="text-gray-400">File size should not exceed 10 MB.</span>
                    </p>
                  </div>
                </div>
                {uploadedFiles.filter(f => f.category === 'Vakalatnama').map(file => (
                  <div key={file.id} className="flex items-center justify-between mt-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">📄 {file.name} ({formatFileSize(file.size)})</span>
                    <button type="button" onClick={() => removeFile(file.id)} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
                  </div>
                ))}
              </div>

              {/* Upload Progress Summary */}
              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Upload Status</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                  <div className={`flex items-center gap-1 ${uploadedFiles.find(f => f.category === 'Index') ? 'text-green-600' : 'text-gray-500'}`}>
                    {uploadedFiles.find(f => f.category === 'Index') ? '✓' : '○'} Index
                  </div>
                  <div className={`flex items-center gap-1 ${uploadedFiles.find(f => f.category === 'Proforma') ? 'text-green-600' : 'text-gray-500'}`}>
                    {uploadedFiles.find(f => f.category === 'Proforma') ? '✓' : '○'} Proforma
                  </div>
                  <div className={`flex items-center gap-1 ${uploadedFiles.find(f => f.category === 'Synopsis') ? 'text-green-600' : 'text-gray-500'}`}>
                    {uploadedFiles.find(f => f.category === 'Synopsis') ? '✓' : '○'} Synopsis
                  </div>
                  <div className={`flex items-center gap-1 ${uploadedFiles.find(f => f.category === 'Memo of Parties') ? 'text-green-600' : 'text-gray-500'}`}>
                    {uploadedFiles.find(f => f.category === 'Memo of Parties') ? '✓' : '○'} Memo
                  </div>
                  <div className={`flex items-center gap-1 ${uploadedFiles.find(f => f.category === 'Complaint Draft') ? 'text-green-600' : 'text-gray-500'}`}>
                    {uploadedFiles.find(f => f.category === 'Complaint Draft') ? '✓' : '○'} Complaint
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Final Submission & Checkout Section */}
          {currentSection === 5 && (
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-xl text-gray-900 mb-2">Final Submission & Checkout</h3>
              <p className="text-sm text-gray-500 mb-6">
                Specify the relief you are seeking from the Consumer Forum.
              </p>
              <div className="space-y-6">
                <div>
                  <label className={labelClass}>Primary Relief Sought *</label>
                  <textarea
                    name="reliefSought"
                    value={formData.reliefSought}
                    onChange={handleInputChange}
                    className={`${inputClass} min-h-[120px]`}
                    placeholder="e.g., Refund of amount paid, Replacement of defective product, Compensation for mental agony and harassment, Cost of litigation"
                    required
                  />
                </div>
              </div>

              {/* Declaration */}
              <div className="mt-8 p-6 bg-black/5 rounded-xl">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="declarationAccepted"
                    checked={formData.declarationAccepted}
                    onChange={(e) => setFormData(prev => ({ ...prev, declarationAccepted: e.target.checked }))}
                    className="mt-1 w-5 h-5 rounded border-gray-300 text-black focus:ring-black cursor-pointer"
                  />
                  <div>
                    <h4 className="font-sans font-semibold text-black mb-2">Declaration</h4>
                    <p className="font-sans text-sm text-black/70 leading-relaxed">
                      I hereby declare that the information furnished above is true and correct to the best of my knowledge and belief. 
                      I also declare that I have not filed any complaint regarding the same cause of action before any other Consumer Forum/Commission.
                    </p>
                  </div>
                </label>
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
