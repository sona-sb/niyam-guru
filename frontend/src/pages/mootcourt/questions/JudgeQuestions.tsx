import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/src/components/common/Button';
import { NoiseOverlay } from '@/src/components/common/NoiseOverlay';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Message {
  id: string;
  sender: 'judge' | 'user';
  content: string;
  timestamp: Date;
}

interface ClarifyingQuestion {
  question_id: number;
  question_text: string;
  context: string;
  category: string;
}

interface UserResponse {
  question_id: number;
  question_text: string;
  response_text: string;
}

export const JudgeQuestions: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isJudgeTyping, setIsJudgeTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Questions state
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userResponses, setUserResponses] = useState<UserResponse[]>([]);
  const [caseTitle, setCaseTitle] = useState<string>('Consumer Complaint');
  const [predictionId, setPredictionId] = useState<string | null>(null);
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allQuestionsAnswered, setAllQuestionsAnswered] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch questions from backend on mount
  useEffect(() => {
    const fetchQuestions = async () => {
      const storedPredictionId = localStorage.getItem('currentPredictionId');
      
      if (!storedPredictionId) {
        setLoadError('No prediction found. Please start from the beginning.');
        setIsLoading(false);
        return;
      }
      
      setPredictionId(storedPredictionId);
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/questions/${storedPredictionId}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `Failed to fetch questions: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
          setCaseTitle(data.case_title || 'Consumer Complaint');
          
          // Add opening statement as first judge message
          const initialMessages: Message[] = [];
          
          if (data.opening_statement) {
            initialMessages.push({
              id: 'judge-opening',
              sender: 'judge',
              content: data.opening_statement,
              timestamp: new Date(),
            });
          }
          
          // Add first question
          initialMessages.push({
            id: `judge-q-${data.questions[0].question_id}`,
            sender: 'judge',
            content: data.questions[0].question_text,
            timestamp: new Date(),
          });
          
          setTimeout(() => {
            setMessages(initialMessages);
            setIsLoading(false);
          }, 500);
        } else {
          throw new Error('No questions received from the server');
        }
      } catch (error) {
        console.error('Error fetching questions:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load questions');
        setIsLoading(false);
      }
    };
    
    fetchQuestions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addJudgeMessage = (content: string) => {
    const newMessage: Message = {
      id: `judge-${Date.now()}`,
      sender: 'judge',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleSendMessage = () => {
    if (!userInput.trim() || isJudgeTyping || allQuestionsAnswered) return;

    const currentQuestion = questions[currentQuestionIndex];
    
    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: userInput.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    
    // Store the response
    const newResponse: UserResponse = {
      question_id: currentQuestion.question_id,
      question_text: currentQuestion.question_text,
      response_text: userInput.trim(),
    };
    setUserResponses((prev) => [...prev, newResponse]);
    
    setUserInput('');

    // Check if there are more questions
    const nextIndex = currentQuestionIndex + 1;
    
    if (nextIndex < questions.length) {
      // Show typing indicator and add next question
      setIsJudgeTyping(true);
      
      setTimeout(() => {
        setIsJudgeTyping(false);
        addJudgeMessage(questions[nextIndex].question_text);
        setCurrentQuestionIndex(nextIndex);
      }, 1000 + Math.random() * 500);
    } else {
      // All questions answered
      setIsJudgeTyping(true);
      
      setTimeout(() => {
        setIsJudgeTyping(false);
        addJudgeMessage("Thank you for your detailed responses. I have all the information needed to finalize the judgment. Please click 'Proceed to Verdict' to view the final decision.");
        setAllQuestionsAnswered(true);
      }, 1000);
    }

    // Focus back on input
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleProceedToVerdict = async () => {
    if (!predictionId || userResponses.length === 0) return;
    
    setIsSubmitting(true);
    
    try {
      // Submit responses to backend
      const response = await fetch(`${API_BASE_URL}/api/questions/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prediction_id: predictionId,
          responses: userResponses,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to submit responses');
      }
      
      const data = await response.json();
      console.log('Responses submitted successfully:', data);
      
      // Save the Q&A session to localStorage for reference
      localStorage.setItem('judgeQASession', JSON.stringify({
        messages,
        responses: userResponses,
        analysisResult: data,
      }));
      
      // Navigate to the verdict prediction page
      navigate('/mootcourt/prediction');
      
    } catch (error) {
      console.error('Error submitting responses:', error);
      // Still navigate even if submission fails - prediction is already in Supabase
      localStorage.setItem('judgeQASession', JSON.stringify({
        messages,
        responses: userResponses,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      navigate('/mootcourt/prediction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="relative min-h-screen w-full bg-[#FAFAFA] flex flex-col items-center justify-center">
        <NoiseOverlay />
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 border-4 border-black/20 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-sans text-lg text-black/70">Preparing Judge's Questions...</p>
          <p className="font-sans text-sm text-black/50 mt-2">Analyzing your case details</p>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div className="relative min-h-screen w-full bg-[#fbf7ef] flex flex-col items-center justify-center">
        <NoiseOverlay />
        <div className="relative z-10 text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-600"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
          </div>
          <h2 className="font-serif text-xl font-medium text-black mb-2">Unable to Load Questions</h2>
          <p className="font-sans text-sm text-black/60 mb-6">{loadError}</p>
          <Button variant="primary" onClick={() => navigate('/mootcourt/intro')}>
            Start New Case
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#fbf7ef] flex flex-col">
      <NoiseOverlay />

      {/* Header */}
      <div className="relative z-10 px-4 md:px-6 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-black/70"
              >
                <circle cx="12" cy="8" r="5" />
                <path d="M20 21a8 8 0 0 0-16 0" />
              </svg>
            </div>
            <div>
              <h2 className="font-serif text-lg font-medium text-black">Hon'ble Judge</h2>
              <p className="font-sans text-sm text-black/50">Consumer Disputes Redressal Forum</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-sans text-xs text-black/50">Case</p>
            <p className="font-sans text-sm font-medium text-black truncate max-w-[150px]">
              {caseTitle}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="relative z-10 px-4 md:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3 bg-black/5 rounded-xl px-4 py-3">
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
            className="text-black/50 flex-shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <p className="font-sans text-sm text-black/60">
            {allQuestionsAnswered 
              ? "All questions answered. Ready to proceed to verdict."
              : `Question ${Math.min(currentQuestionIndex + 1, questions.length)} of ${questions.length} — Please provide detailed and honest responses.`
            }
          </p>
        </div>
      </div>

      {/* Messages Container */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 md:px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] md:max-w-[70%] ${
                  message.sender === 'user'
                    ? 'bg-black text-[#FAF3E8] rounded-2xl rounded-br-md'
                    : 'bg-[#FAF3E8] border border-[#EBEBEB] text-black rounded-2xl rounded-bl-md'
                } px-4 py-3 shadow-sm`}
              >
                {message.sender === 'judge' && (
                  <p className="font-sans text-xs text-black/50 mb-1 font-medium">Hon'ble Judge</p>
                )}
                <p className={`font-sans text-[15px] leading-relaxed whitespace-pre-wrap ${
                  message.sender === 'user' ? 'text-[#FAF3E8]' : 'text-black/90'
                }`}>
                  {message.content}
                </p>
                <p className={`font-sans text-xs mt-2 ${
                  message.sender === 'user' ? 'text-white/50' : 'text-black/40'
                }`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isJudgeTyping && (
            <div className="flex justify-start">
              <div className="bg-white border border-black/10 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <p className="font-sans text-xs text-black/50 mb-1 font-medium">Hon'ble Judge</p>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-black/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-black/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-black/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="relative z-10 px-4 md:px-6 py-4">
        <div className="max-w-4xl mx-auto">
          {allQuestionsAnswered ? (
            <div className="flex flex-col items-center gap-4">
              <p className="font-sans text-sm text-black/60 text-center">
                The Judge has completed all clarifying questions.
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={handleProceedToVerdict}
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    Proceed to Verdict
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
                      <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z" />
                    </svg>
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your response to the Judge..."
                  className="w-full px-4 py-4 bg-black/5 border-0 rounded-xl font-sans text-[15px] text-black placeholder-black/40 focus:outline-none focus:ring-2 focus:ring-black/20 resize-none min-h-[52px] max-h-[150px]"
                  rows={1}
                  disabled={isJudgeTyping}
                />
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={handleSendMessage}
                disabled={!userInput.trim() || isJudgeTyping}
                className="flex items-center justify-center h-[52px] w-[52px] !p-0 rounded-xl mb-[7px]"
              >
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
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              </Button>
            </div>
          )}
          <p className="font-sans text-xs text-black/40 text-center mt-3">
            Press Enter to send • Shift + Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};
