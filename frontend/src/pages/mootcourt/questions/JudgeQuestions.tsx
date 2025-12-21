import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/src/components/common/Button';
import { NoiseOverlay } from '@/src/components/common/NoiseOverlay';

interface Message {
  id: string;
  sender: 'judge' | 'user';
  content: string;
  timestamp: Date;
}

interface ComplaintFormData {
  complainantName: string;
  oppositePartyName: string;
  deficiencyType: string;
  grievanceDescription: string;
  purchaseAmount: string;
  compensationAmount: string;
}

const initialJudgeQuestions = [
  "I have reviewed your complaint. Before we proceed, I need some clarifications to better understand your case.",
  "Can you provide more specific details about when you first noticed the deficiency in the product/service?",
];

export const JudgeQuestions: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isJudgeTyping, setIsJudgeTyping] = useState(false);
  const [complaintData, setComplaintData] = useState<ComplaintFormData | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Follow-up questions based on case context
  const getFollowUpQuestions = (data: ComplaintFormData | null): string[] => {
    const questions = [
      "Did you attempt to contact the opposite party to resolve this matter before filing this complaint? If yes, please describe their response.",
      "Do you have any witnesses who can corroborate your claims? Please provide their details if available.",
      "Have you suffered any additional losses beyond the direct financial loss? For example, mental distress, inconvenience, or loss of business opportunity?",
      `You have claimed compensation of ₹${data?.compensationAmount ? Number(data.compensationAmount).toLocaleString('en-IN') : 'the stated amount'}. Can you provide a breakdown of how you arrived at this figure?`,
      "Is there any other information or evidence you would like to bring to my attention that may be relevant to this case?",
      "Thank you for your responses. I have sufficient information to proceed with the hearing. Please click 'Proceed to Hearing' to continue.",
    ];
    return questions;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Load complaint data
    const savedData = localStorage.getItem('consumerComplaintData');
    if (savedData) {
      setComplaintData(JSON.parse(savedData));
    }

    // Initialize with judge's opening message
    const initialMessages: Message[] = initialJudgeQuestions.map((content, index) => ({
      id: `judge-initial-${index}`,
      sender: 'judge',
      content,
      timestamp: new Date(),
    }));
    
    // Add messages with slight delay for effect
    setTimeout(() => {
      setMessages(initialMessages);
    }, 500);
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
    if (!userInput.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: userInput.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setUserInput('');

    // Simulate judge typing
    setIsJudgeTyping(true);

    // Get follow-up questions
    const followUpQuestions = getFollowUpQuestions(complaintData);

    // Add judge's follow-up question after delay
    setTimeout(() => {
      setIsJudgeTyping(false);
      if (questionIndex < followUpQuestions.length) {
        addJudgeMessage(followUpQuestions[questionIndex]);
        setQuestionIndex((prev) => prev + 1);
      }
    }, 1500 + Math.random() * 1000);

    // Focus back on input
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleVerdict = () => {
    // Save the Q&A session
    localStorage.setItem('judgeQASession', JSON.stringify(messages));
    // Navigate to the verdict prediction page
    navigate('/mootcourt/prediction');
  };

  const isLastQuestion = questionIndex >= getFollowUpQuestions(complaintData).length;

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="relative min-h-screen w-full bg-[#FAFAFA] flex flex-col">
      <NoiseOverlay />

      {/* Header */}
      <div className="relative z-10 bg-white border-b border-black/10 px-4 md:px-6 py-4">
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
            <p className="font-sans text-xs text-black/50">Case Reference</p>
            <p className="font-sans text-sm font-medium text-black">
              CC/{new Date().getFullYear()}/
              {String(Math.floor(Math.random() * 9000) + 1000)}
            </p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="relative z-10 bg-blue-50 border-b border-blue-100 px-4 md:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
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
            className="text-blue-600 flex-shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <p className="font-sans text-sm text-blue-800">
            The Judge is asking clarifying questions about your complaint. Please provide detailed and honest responses.
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
                    ? 'bg-black text-white rounded-2xl rounded-br-md'
                    : 'bg-white border border-black/10 text-black rounded-2xl rounded-bl-md'
                } px-4 py-3 shadow-sm`}
              >
                {message.sender === 'judge' && (
                  <p className="font-sans text-xs text-black/50 mb-1 font-medium">Hon'ble Judge</p>
                )}
                <p className={`font-sans text-[15px] leading-relaxed whitespace-pre-wrap ${
                  message.sender === 'user' ? 'text-white' : 'text-black/90'
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
      <div className="relative z-10 bg-white border-t border-black/10 px-4 md:px-6 py-4">
        <div className="max-w-4xl mx-auto">
          {isLastQuestion ? (
            <div className="flex flex-col items-center gap-4">
              <p className="font-sans text-sm text-black/60 text-center">
                The Judge has completed the preliminary questions.
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={handleVerdict}
                className="flex items-center gap-2"
              >
                Verdict
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
                  className="w-full px-4 py-3 bg-black/5 border-0 rounded-xl font-sans text-[15px] text-black placeholder-black/40 focus:outline-none focus:ring-2 focus:ring-black/20 resize-none min-h-[52px] max-h-[150px]"
                  rows={1}
                  disabled={isJudgeTyping}
                />
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={handleSendMessage}
                disabled={!userInput.trim() || isJudgeTyping}
                className="flex items-center justify-center h-[52px] w-[52px] !p-0 rounded-xl"
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
