import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NoiseOverlay } from '@/src/components/common/NoiseOverlay';
import { Footer } from '@/src/components/layout/Footer';
import { Sidebar } from '@/src/components/layout/Sidebar';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';

// Interface matching the Supabase table structure
interface Case {
  id: string;
  caseName: string;
  caseType: string;
  filingDate: string;
  status: 'pending' | 'in-progress' | 'completed';
  complainantName: string;
  oppositePartyName: string;
}

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
  
  // State for cases and dialog
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCase, setNewCase] = useState({
    caseName: '',
    complainantName: '',
    oppositePartyName: '',
    filingDate: new Date().toISOString().split('T')[0],
    status: 'pending' as Case['status'],
  });

  // Get user display name from email
  const userEmail = user?.email || '';
  const userName = userEmail ? userEmail.split('@')[0] : 'User';
  // Capitalize first letter of each word
  const displayName = userName
    .split(/[._-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  const userInitial = displayName.charAt(0).toUpperCase();

  // Fetch cases from Supabase on component mount
  useEffect(() => {
    if (user?.id) {
      fetchCases();
    }
  }, [user?.id]);

  const fetchCases = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_cases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cases:', error);
        return;
      }

      // Transform database columns to camelCase for frontend
      const transformedCases: Case[] = (data || []).map(row => ({
        id: row.id,
        caseName: row.case_name,
        caseType: row.case_type,
        filingDate: row.filing_date,
        status: row.status,
        complainantName: row.complainant_name,
        oppositePartyName: row.opposite_party_name,
      }));

      setCases(transformedCases);
    } catch (err) {
      console.error('Error fetching cases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewCase = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setNewCase({
      caseName: '',
      complainantName: '',
      oppositePartyName: '',
      filingDate: new Date().toISOString().split('T')[0],
      status: 'pending',
    });
  };

  const handleCreateCase = async () => {
    if (!newCase.caseName || !newCase.complainantName || !newCase.oppositePartyName || !user?.id) {
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('user_cases')
        .insert({
          user_id: user.id,
          case_name: newCase.caseName,
          case_type: 'Consumer Complaint',
          filing_date: newCase.filingDate,
          status: newCase.status,
          complainant_name: newCase.complainantName,
          opposite_party_name: newCase.oppositePartyName,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating case:', error);
        return;
      }

      // Add the new case to the list
      const createdCase: Case = {
        id: data.id,
        caseName: data.case_name,
        caseType: data.case_type,
        filingDate: data.filing_date,
        status: data.status,
        complainantName: data.complainant_name,
        oppositePartyName: data.opposite_party_name,
      };

      setCases(prev => [createdCase, ...prev]);
      handleCloseDialog();
    } catch (err) {
      console.error('Error creating case:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCaseClick = () => {
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
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-4"></div>
              <p className="text-gray-500 text-sm">Loading your cases...</p>
            </div>
          ) : cases.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cases.map((caseItem) => (
                <div
                  key={caseItem.id}
                  onClick={handleCaseClick}
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No cases registered yet
              </h3>
              <p className="text-gray-500 text-center mb-6 max-w-md text-sm">
                Start by registering your first consumer complaint. Our AI-powered
                system will help you through the process.
              </p>
            </div>
          )}
          </main>

          <Footer />
        </div>
      </div>

      {/* New Case Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCloseDialog}
          />
          
          {/* Dialog */}
          <div className="relative bg-[#FAF3E8] rounded-lg p-8 w-full max-w-md mx-4 shadow-2xl border border-[#EBEBEB]">
            <h3 className="text-2xl font-semibold text-black mb-6">Register New Case</h3>
            
            <div className="space-y-4">
              {/* Case Title */}
              <div>
                <label className="block font-sans text-[10px] uppercase tracking-widest font-bold text-black/70 mb-2">
                  Case Title *
                </label>
                <input
                  type="text"
                  value={newCase.caseName}
                  onChange={(e) => setNewCase(prev => ({ ...prev, caseName: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#FAF3E8] border-2 border-black/20 rounded-xl font-sans text-[15px] text-black/80 placeholder-black/40 focus:outline-none focus:border-black/50 transition-all duration-300"
                  placeholder="Enter case title"
                />
              </div>

              {/* Complainant Name */}
              <div>
                <label className="block font-sans text-[10px] uppercase tracking-widest font-bold text-black/70 mb-2">
                  Complainant Name *
                </label>
                <input
                  type="text"
                  value={newCase.complainantName}
                  onChange={(e) => setNewCase(prev => ({ ...prev, complainantName: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#FAF3E8] border-2 border-black/20 rounded-xl font-sans text-[15px] text-black/80 placeholder-black/40 focus:outline-none focus:border-black/50 transition-all duration-300"
                  placeholder="Enter complainant name"
                />
              </div>

              {/* Against */}
              <div>
                <label className="block font-sans text-[10px] uppercase tracking-widest font-bold text-black/70 mb-2">
                  Against *
                </label>
                <input
                  type="text"
                  value={newCase.oppositePartyName}
                  onChange={(e) => setNewCase(prev => ({ ...prev, oppositePartyName: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#FAF3E8] border-2 border-black/20 rounded-xl font-sans text-[15px] text-black/80 placeholder-black/40 focus:outline-none focus:border-black/50 transition-all duration-300"
                  placeholder="Enter opposite party name"
                />
              </div>

              {/* Filing Date */}
              <div>
                <label className="block font-sans text-[10px] uppercase tracking-widest font-bold text-black/70 mb-2">
                  Filing Date
                </label>
                <input
                  type="date"
                  value={newCase.filingDate}
                  onChange={(e) => setNewCase(prev => ({ ...prev, filingDate: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#FAF3E8] border-2 border-black/20 rounded-xl font-sans text-[15px] text-black/80 focus:outline-none focus:border-black/50 transition-all duration-300"
                />
              </div>

              {/* Case Status */}
              <div>
                <label className="block font-sans text-[10px] uppercase tracking-widest font-bold text-black/70 mb-2">
                  Case Status
                </label>
                <div className="relative">
                  <select
                    value={newCase.status}
                    onChange={(e) => setNewCase(prev => ({ ...prev, status: e.target.value as Case['status'] }))}
                    className="w-full px-4 py-2.5 bg-[#FAF3E8] border-2 border-black/20 rounded-xl font-sans text-[15px] text-black/80 focus:outline-none focus:border-black/50 transition-all duration-300 appearance-none cursor-pointer"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={handleCloseDialog}
                disabled={isCreating}
                className="px-4 py-2 text-black/70 hover:text-black text-sm font-medium rounded-lg hover:bg-black/5 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCase}
                disabled={!newCase.caseName || !newCase.complainantName || !newCase.oppositePartyName || isCreating}
                className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  'Create Case'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCases;