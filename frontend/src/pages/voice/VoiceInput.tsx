import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Send, ArrowRight, Loader2, User, Bot } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const VoiceInput: React.FC = () => {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US'; // Will auto-detect other languages
      
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptText = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptText;
          } else {
            interimTranscript += transcriptText;
          }
        }
        
        const newTranscript = transcriptRef.current + finalTranscript;
        transcriptRef.current = newTranscript;
        setTranscript(newTranscript + interimTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        if (isRecording) {
          // Restart if still recording
          recognitionRef.current?.start();
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isRecording]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // Pulse animation for recording
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setPulseAnimation(prev => !prev);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      setTranscript('');
      transcriptRef.current = '';
      setIsRecording(true);
      
      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }

      // Also record audio for potential backend processing
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.start();
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    // Get the final transcript from ref (more reliable than state)
    const finalTranscript = transcriptRef.current.trim() || transcript.trim();
    
    // Always transition to chat, even if no transcript (user can type instead)
    setHasRecorded(true);
    
    // Transition to chat after a brief delay
    setTimeout(() => {
      setShowChat(true);
      
      if (finalTranscript) {
        // Add the user's voice input as the first message
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: finalTranscript,
          timestamp: new Date()
        };
        setMessages([userMessage]);
        
        // Process with AI
        setTimeout(() => {
          processUserInput(finalTranscript);
        }, 500);
      } else {
        // No transcript - show welcome message prompting user to type
        const welcomeMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `I couldn't catch what you said. No worries!\n\nPlease type your consumer issue below, or tap the microphone to try again.\n\nI'm here to help you:\n• Understand your consumer rights\n• File a formal complaint\n• Analyze your case strength`,
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
      }
    }, 500);
  };

  const processUserInput = async (input: string) => {
    setIsProcessing(true);
    
    // Simulate AI agent processing
    // In production, this would call your backend API
    setTimeout(() => {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I understand you're facing a consumer issue. Let me help you with that.\n\nBased on what you've told me, I can help you:\n\n1. **File a formal complaint** - I'll guide you through the process\n2. **Understand your rights** - I'll explain the relevant consumer protection laws\n3. **Estimate your case strength** - I'll analyze your situation\n\nWould you like me to proceed with filing a complaint, or would you like to provide more details about your issue?`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsProcessing(false);
    }, 2000);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    processUserInput(inputValue);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Voice Input Screen
  if (!showChat) {
    return (
      <div className="min-h-screen w-full bg-[#fbf7ef] flex flex-col">
        {/* Debug Navigation Button - Fixed top right */}
        <div className="absolute top-6 right-6 z-50">
          <button
            onClick={() => navigate('/mootcourt/intro')}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Skip to Moot Court
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Header - Centered Heading */}
        {!isRecording && (
          <div className="text-center px-6 md:px-12 pt-10">
            <h1 className="text-4xl md:text-5xl font-serif text-black mb-3">
              Tell us about your <span className="italic font-vesper">consumer issue</span>
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed max-w-xl mx-auto">
              Speak in <span className="font-semibold">any language</span> you're comfortable with — 
              Hindi, English, Tamil, Bengali, or any regional language.
            </p>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center px-6 pt-8 pb-8">
          {/* Microphone Button - Centered */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative mb-4">
              {/* Pulse rings when recording */}
              {isRecording && (
                <>
                  <div 
                    className="absolute inset-0 rounded-full bg-red-400/20 animate-ping"
                    style={{ 
                      width: '200px', 
                      height: '200px',
                      left: '-30px',
                      top: '-30px'
                    }}
                  />
                  <div 
                    className={`absolute rounded-full bg-red-400/30 transition-transform duration-1000 ${pulseAnimation ? 'scale-125' : 'scale-100'}`}
                    style={{ 
                      width: '180px', 
                      height: '180px',
                      left: '-20px',
                      top: '-20px'
                    }}
                  />
                </>
              )}
              
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`relative w-[140px] h-[140px] rounded-full flex items-center justify-center transition-all duration-300 ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/40' 
                    : 'bg-black hover:bg-gray-800 shadow-xl hover:shadow-2xl'
                }`}
              >
                {isRecording ? (
                  <MicOff size={56} className="text-white" />
                ) : (
                  <Mic size={56} className="text-white" />
                )}
              </button>
            </div>

            {/* Status text below mic */}
            <p className="text-gray-500 text-sm mb-8">
              {isRecording ? 'Tap to stop recording' : 'Tap to start recording'}
            </p>

            {/* Recording Status */}
            {isRecording && (
              <div className="text-center mt-8">
                <h2 className="text-2xl font-serif text-black mb-3">
                  Listening...
                </h2>
                <p className="text-gray-600 font-medium mb-6">
                  Tap the microphone again when you're done speaking
                </p>
                {/* Live transcript preview */}
                {transcript && (
                  <div className="bg-white/80 rounded-xl p-4 border border-gray-200 max-h-40 overflow-y-auto text-left max-w-lg mx-auto">
                    <p className="text-gray-700 text-sm italic">"{transcript}"</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Or Divider */}
          {!isRecording && (
            <div className="flex items-center gap-4 w-full max-w-md mb-5">
              <div className="flex-1 h-px bg-gray-300" />
              <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-gray-300" />
            </div>
          )}

          {/* Text Input Alternative */}
          {!isRecording && (
            <div className="w-full max-w-lg mb-10">
              <div className="relative">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && inputValue.trim()) {
                      e.preventDefault();
                      // Transition to chat with typed input
                      setShowChat(true);
                      const userMessage: Message = {
                        id: Date.now().toString(),
                        role: 'user',
                        content: inputValue.trim(),
                        timestamp: new Date()
                      };
                      setMessages([userMessage]);
                      const textToProcess = inputValue.trim();
                      setInputValue('');
                      setTimeout(() => {
                        processUserInput(textToProcess);
                      }, 500);
                    }
                  }}
                  placeholder="Type your consumer issue here..."
                  rows={3}
                  className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-300 shadow-sm"
                />
                <button
                  onClick={() => {
                    if (inputValue.trim()) {
                      setShowChat(true);
                      const userMessage: Message = {
                        id: Date.now().toString(),
                        role: 'user',
                        content: inputValue.trim(),
                        timestamp: new Date()
                      };
                      setMessages([userMessage]);
                      const textToProcess = inputValue.trim();
                      setInputValue('');
                      setTimeout(() => {
                        processUserInput(textToProcess);
                      }, 500);
                    }
                  }}
                  disabled={!inputValue.trim()}
                  className="absolute right-3 bottom-3 px-4 py-2 bg-black text-white text-sm font-medium rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800 transition-all flex items-center gap-2"
                >
                  <Send size={14} />
                  Send
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center mt-3">
                Press Enter to send or click the button
              </p>
            </div>
          )}

          {/* Language indicators at the bottom */}
          {!isRecording && (
            <div className="flex flex-wrap justify-center gap-2 mt-auto pt-4">
              {['English', 'हिंदी', 'தமிழ்', 'తెలుగు', 'বাংলা', 'मराठी', 'ગુજરાતી', 'ಕನ್ನಡ'].map((lang) => (
                <span 
                  key={lang}
                  className="px-3 py-1 bg-white/60 rounded-full text-sm text-gray-600 border border-gray-200"
                >
                  {lang}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Chat Interface Screen
  return (
    <div className="min-h-screen w-full bg-[#fbf7ef] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#fbf7ef]/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-serif text-lg text-black">Niyam Guru Assistant</h1>
              <p className="text-xs text-gray-500">AI Legal Assistant</p>
            </div>
          </div>
          
          {/* Debug Navigation */}
          <button
            onClick={() => navigate('/mootcourt/intro')}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Proceed to Filing
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-6 py-6"
      >
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                message.role === 'user' ? 'bg-gray-200' : 'bg-black'
              }`}>
                {message.role === 'user' ? (
                  <User size={18} className="text-gray-600" />
                ) : (
                  <Bot size={18} className="text-white" />
                )}
              </div>
              
              {/* Message Bubble */}
              <div className={`max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block px-4 py-3 rounded-2xl ${
                  message.role === 'user' 
                    ? 'bg-black text-white rounded-tr-sm' 
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
                <p className="text-xs text-gray-400 mt-1 px-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {isProcessing && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-black flex items-center justify-center">
                <Bot size={18} className="text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 bg-[#fbf7ef]/95 backdrop-blur-sm border-t border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3">
            {/* Voice input button */}
            <button
              onClick={() => {
                setShowChat(false);
                setHasRecorded(false);
                setTranscript('');
              }}
              className="flex-shrink-0 w-11 h-11 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              title="Record voice message"
            >
              <Mic size={20} className="text-gray-600" />
            </button>
            
            {/* Text input */}
            <div className="flex-1 relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message..."
                rows={1}
                className="w-full px-4 py-3 pr-12 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-300"
                style={{ maxHeight: '120px' }}
              />
              
              {/* Send button */}
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isProcessing}
                className="absolute right-2 bottom-2 w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
              >
                {isProcessing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
          
          <p className="text-xs text-gray-400 text-center mt-3">
            Niyam Guru can help you understand your consumer rights and file complaints
          </p>
        </div>
      </div>
    </div>
  );
};

export default VoiceInput;
