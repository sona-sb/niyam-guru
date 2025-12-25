import React from 'react';
import { useNavigate } from 'react-router-dom';
import { NoiseOverlay } from '@/src/components/common/NoiseOverlay';
import { Footer } from '@/src/components/layout/Footer';
import { Sidebar } from '@/src/components/layout/Sidebar';
import { useAuth } from '@/src/contexts/AuthContext';

// Mock data for registered cases - replace with actual data from your backend/state
interface Case {
  id: string;
  caseName: string;
  caseType: string;
  filingDate: string;
  status: 'pending' | 'in-progress' | 'completed';
  complainantName: string;
  oppositePartyName: string;
}

const mockCases: Case[] = [
  {
    id: '1',
    caseName: 'XYZ Electronics Defective Product',
    caseType: 'Consumer Complaint',
    filingDate: '2025-12-15',
    status: 'pending',
    complainantName: 'John Doe',
    oppositePartyName: 'XYZ Electronics Pvt. Ltd.',
  },
  {
    id: '2',
    caseName: 'ABC Services Refund Issue',
    caseType: 'Consumer Complaint',
    filingDate: '2025-12-10',
    status: 'in-progress',
    complainantName: 'Jane Smith',
    oppositePartyName: 'ABC Services Ltd.',
  },
  {
    id: '3',
    caseName: 'Home Appliances Warranty Dispute',
    caseType: 'Consumer Complaint',
    filingDate: '2025-12-05',
    status: 'completed',
    complainantName: 'Raj Kumar',
    oppositePartyName: 'Home Appliances Co.',
  },
  {
    id: '4',
    caseName: 'Mobile Phone Service Deficiency',
    caseType: 'Consumer Complaint',
    filingDate: '2025-11-28',
    status: 'pending',
    complainantName: 'Priya Sharma',
    oppositePartyName: 'TeleCom Services',
  },
  {
    id: '5',
    caseName: 'Insurance Claim Rejection',
    caseType: 'Consumer Complaint',
    filingDate: '2025-11-20',
    status: 'in-progress',
    complainantName: 'Amit Patel',
    oppositePartyName: 'SafeLife Insurance',
  },
];

const getStatusColor = (status: Case['status']) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-100';
    case 'in-progress':
      return 'bg-blue-100 text-blue-800 border-blue-100';
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-100';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-100';
  }
};

const getStatusLabel = (status: Case['status']) => {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'in-progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    default:
      return 'Unknown';
  }
};

export const MyCases: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Get user display name from email
  const userEmail = user?.email || '';
  const userName = userEmail ? userEmail.split('@')[0] : 'User';
  // Capitalize first letter of each word
  const displayName = userName
    .split(/[._-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  const userInitial = displayName.charAt(0).toUpperCase();

  const handleNewCase = () => {
    navigate('/mootcourt/intro');
  };

  return (
    <div className="relative min-h-screen w-full bg-[#fbf7ef] text-black">
      {/* Noise Texture Overlay */}
      <NoiseOverlay />

      {/* Collapsed Sidebar */}
      <Sidebar userInitial={userInitial} userEmail={userEmail} />

      {/* Main Content Container - with left margin for collapsed sidebar */}
      <div className="relative z-10 ml-16 min-h-screen flex flex-col">
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 py-8 flex flex-col flex-grow w-full">
          <main className="flex-grow">
            {/* Welcome Section */}
            <div className="mb-12">
              <h1 className="text-4xl md:text-5xl font-serif text-black mb-3">
                Welcome Back, <span className="italic font-vesper">{displayName}</span>
              </h1>
              <button className="inline-flex items-center gap-1.5 px-4 py-3 text-gray-700 rounded-full border border-black text-sm font-medium hover:bg-[#e8e4dc] transition-colors">
                Check Usage
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7 7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Cases Section */}
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-black mb-4">Cases</h2>
              
              {/* Search and Register Row */}
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-xs border border-[#EBEBEB] rounded-lg">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search for a case"
                    className="w-full pl-10 pr-4 py-2 bg-[#FAF3E8] rounded-lg text-xs placeholder-gray-400 focus:outline-none transition-colors"
                  />
                </div>
                <button
                  onClick={handleNewCase}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors duration-200 font-medium text-xs"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Register a Case
                </button>
              </div>
            </div>

          {/* Cases Grid */}
          {mockCases.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {mockCases.map((caseItem) => (
                <div
                  key={caseItem.id}
                  className="group bg-[#FAF3E8] border border-[#EBEBEB] rounded-lg p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Case Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-md font-semibold text-gray-900 group-hover:text-black transition-colors line-clamp-2">
                        {caseItem.caseName}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {caseItem.caseType}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-lg border ${getStatusColor(
                        caseItem.status
                      )}`}
                    >
                      {getStatusLabel(caseItem.status)}
                    </span>
                  </div>

                  {/* Case Details */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span className="text-gray-600">
                        Complainant:{' '}
                        <span className="font-medium text-gray-800">
                          {caseItem.complainantName}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                      <span className="text-gray-600">
                        Against:{' '}
                        <span className="font-medium text-gray-800">
                          {caseItem.oppositePartyName}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-gray-600">
                        Filed on:{' '}
                        <span className="font-medium text-gray-800">
                          {new Date(caseItem.filingDate).toLocaleDateString(
                            'en-IN',
                            {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            }
                          )}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* View Details Arrow */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-end">
                    <span className="text-sm text-gray-500 group-hover:text-black transition-colors flex items-center gap-1">
                      View Details
                      <svg
                        className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No cases registered yet
              </h3>
              <p className="text-gray-500 text-center mb-6 max-w-md">
                Start by registering your first consumer complaint. Our AI-powered
                system will help you through the process.
              </p>
              <button
                onClick={handleNewCase}
                className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors duration-200 font-medium"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Register Your First Case
              </button>
            </div>
          )}
          </main>

          <Footer />
        </div>
      </div>
    </div>
  );
};

export default MyCases;