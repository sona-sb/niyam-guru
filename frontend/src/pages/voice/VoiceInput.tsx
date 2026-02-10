import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mic, MicOff, Send, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { apiClient } from '@/src/lib/apiClient';

export const VoiceInput: React.FC = () => {
  const navigate = useNavigate();
  const { caseId } = useParams<{ caseId?: string }>();
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [pulseAnimation, setPulseAnimation] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
      setIsRecording(true);

      // Record audio for Sarvam AI backend processing
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

    // Stop media recorder and send audio to Sarvam AI backend
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = async () => {
        // Build audio blob from recorded chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());

        setIsTranscribing(true);

        try {
          // Send to Sarvam AI via backend
          const formData = new FormData();
          formData.append('file', audioBlob, 'recording.webm');
          formData.append('language_code', 'unknown'); // Auto-detect language
          
          const API_BASE = import.meta.env.VITE_API_URL || '';
          const response = await fetch(`${API_BASE}/api/voice/transcribe`, {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            const data = await response.json();
            const originalTranscript = data.transcript || '';
            const englishTranslation = data.english_translation || null;
            const langCode = data.language_code || null;
            
            setIsTranscribing(false);

            if (originalTranscript) {
              // Save voice transcript to backend under the current case
              if (caseId) {
                try {
                  await apiClient.post('/api/chat/voice-transcript', {
                    user_id: user?.id || '',
                    case_id: caseId,
                    original_transcript: originalTranscript,
                    english_translation: englishTranslation,
                    language_code: langCode,
                  });
                } catch (err) {
                  console.error('Failed to save voice transcript:', err);
                }
              }

              // Navigate to chat with transcript data under this case
              navigate(caseId ? `/chat/${caseId}` : '/chat', {
                state: {
                  transcript: originalTranscript,
                  caseId: caseId || null,
                },
              });
            } else {
              // No transcript — navigate to chat
              navigate(caseId ? `/chat/${caseId}` : '/chat');
            }
          } else {
            // API error
            console.error('Sarvam API error:', response.status);
            setIsTranscribing(false);
            navigate(caseId ? `/chat/${caseId}` : '/my-cases');
          }
        } catch (err) {
          console.error('Error sending audio to backend:', err);
          setIsTranscribing(false);
          navigate(caseId ? `/chat/${caseId}` : '/my-cases');
        }
      };
      
      mediaRecorderRef.current.stop();
    } else {
      navigate(caseId ? `/chat/${caseId}` : '/my-cases');
    }
  };

  // Navigate to chat with typed input
  const handleTextSubmit = () => {
    if (!inputValue.trim()) return;
    navigate(caseId ? `/chat/${caseId}` : '/chat', {
      state: { transcript: inputValue.trim(), caseId: caseId || null },
    });
  };

  // Voice Input Screen
  return (
      <div className="min-h-screen w-full bg-[#fbf7ef] flex flex-col">
        {/* Debug Navigation Button - Fixed top right */}
        <div className="absolute top-6 right-6 z-50">
          <button
            onClick={() => navigate('/mootcourt/intro')}
            className="inline-flex items-center gap-1.5 px-4 py-3 text-gray-700 rounded-full border border-black text-sm font-medium hover:bg-[#e8e4dc] transition-colors"
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
                    className="absolute rounded-2xl bg-red-400/20 animate-ping"
                    style={{ 
                      width: '200px', 
                      height: '80px',
                      left: '-20px',
                      top: '-10px'
                    }}
                  />
                  <div 
                    className={`absolute rounded-2xl bg-red-400/30 transition-transform duration-1000 ${pulseAnimation ? 'scale-110' : 'scale-100'}`}
                    style={{ 
                      width: '180px', 
                      height: '70px',
                      left: '-10px',
                      top: '-5px'
                    }}
                  />
                </>
              )}
              
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`relative px-8 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/40' 
                    : 'bg-black hover:bg-gray-800 shadow-xl hover:shadow-2xl'
                }`}
              >
                {isRecording ? (
                  <MicOff size={24} className="text-white" />
                ) : (
                  <Mic size={24} className="text-white" />
                )}
                <span className="text-white font-medium text-sm">
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </span>
              </button>
            </div>

            {/* Status text below mic */}
            <p className="text-xs text-gray-400 text-center mt-3"> 
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
              </div>
            )}

            {/* Transcribing with Sarvam AI */}
            {isTranscribing && !isRecording && (
              <div className="text-center mt-8">
                <Loader2 className="w-10 h-10 text-black animate-spin mx-auto mb-4" />
                <h2 className="text-2xl font-serif text-black mb-3">
                  Transcribing...
                </h2>
                <p className="text-gray-600 font-medium">
                  Processing your voice with Sarvam AI
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Auto-detecting language
                </p>
              </div>
            )}
          </div>

          {/* Or Divider */}
          {!isRecording && !isTranscribing && (
            <div className="flex items-center gap-4 w-full max-w-md mb-5">
              <div className="flex-1 h-px bg-gray-300" />
              <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-gray-300" />
            </div>
          )}

          {/* Text Input Alternative */}
          {!isRecording && !isTranscribing && (
            <div className="w-full max-w-lg mb-10">
              <div className="relative">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && inputValue.trim()) {
                      e.preventDefault();
                      handleTextSubmit();
                    }
                  }}
                  placeholder="Type your consumer issue here..."
                  rows={3}
                  className="w-full px-5 py-4 bg-[#FAF3E8] border border-gray-200 rounded-2xl text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-300 shadow-sm"
                />
                <button
                  onClick={handleTextSubmit}
                  disabled={!inputValue.trim()}
                  className="absolute right-1.5 bottom-3 px-4 py-2 bg-black text-white text-sm font-medium rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800 transition-all flex items-center gap-2"
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
          {!isRecording && !isTranscribing && (
            <div className="flex flex-wrap justify-center gap-2 mt-auto pt-4">
              {['English', 'हिंदी', 'தமிழ்', 'తెలుగు', 'বাংলা', 'मराठी', 'ગુજરાતી', 'ಕನ್ನಡ'].map((lang) => (
                <span 
                  key={lang}
                  className="px-3 py-1 bg-[#FAF3E8] rounded-full text-sm text-gray-600 border border-gray-200"
                >
                  {lang}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
};

export default VoiceInput;
