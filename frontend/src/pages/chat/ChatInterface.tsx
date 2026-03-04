import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Mic, MicOff, Send, ArrowRight, Loader2, User, Bot, Mail, Check, X, FileText, Download } from 'lucide-react';
import { apiClient } from '@/src/lib/apiClient';
import { useAuth } from '@/src/contexts/AuthContext';

interface EmailDraft {
  id: string;
  to_email: string;
  subject: string;
  body: string;
  status: string;
}

interface DocumentPack {
  documents: Record<string, string>;       // key → base64 PDF
  document_names: Record<string, string>;  // key → filename
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  emailDraft?: EmailDraft;
  documentPack?: DocumentPack;
}

// ---------------------------------------------------------------------------
// Email Preview Card — shown inline after an assistant message that drafted an email
// ---------------------------------------------------------------------------

const EmailPreviewCard: React.FC<{
  draft: EmailDraft;
  onApprove: (emailId: string) => Promise<void>;
  onDiscard: (emailId: string) => void;
}> = ({ draft, onApprove, onDiscard }) => {
  const [sending, setSending] = React.useState(false);

  const isFinal = draft.status === 'sent' || draft.status === 'discarded' || draft.status === 'failed';

  return (
    <div className="mt-2 border border-gray-200 rounded-xl bg-gray-50 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-gray-100">
        <Mail size={14} className="text-gray-500" />
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email Draft</span>
        <span
          className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full ${
            draft.status === 'sent'
              ? 'bg-green-100 text-green-700'
              : draft.status === 'discarded'
              ? 'bg-gray-200 text-gray-500'
              : draft.status === 'failed'
              ? 'bg-red-100 text-red-600'
              : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {draft.status === 'pending_review' ? 'Pending Review' : draft.status}
        </span>
      </div>

      {/* Fields */}
      <div className="px-4 py-3 space-y-1.5 text-sm">
        <div className="flex gap-2">
          <span className="text-gray-400 w-14 shrink-0">To:</span>
          <span className="text-gray-700 font-medium">{draft.to_email}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-gray-400 w-14 shrink-0">Subject:</span>
          <span className="text-gray-700 font-medium">{draft.subject}</span>
        </div>
        <div className="mt-2 border-t border-gray-100 pt-2">
          <p className="text-gray-600 text-xs leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
            {draft.body}
          </p>
        </div>
      </div>

      {/* Actions */}
      {!isFinal && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-gray-100 bg-white">
          <button
            onClick={async () => {
              setSending(true);
              await onApprove(draft.id);
              setSending(false);
            }}
            disabled={sending}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {sending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            {sending ? 'Sending…' : 'Approve & Send'}
          </button>
          <button
            onClick={() => onDiscard(draft.id)}
            disabled={sending}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-gray-500 rounded-full border border-gray-200 hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            <X size={12} />
            Discard
          </button>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Document Pack Card — shown inline when the agent generates filing documents
// ---------------------------------------------------------------------------

const DOC_LABELS: Record<string, { label: string; icon: string }> = {
  index:           { label: 'Index / List of Documents',      icon: '📋' },
  proforma:        { label: 'Complaint Proforma',             icon: '📝' },
  affidavit:       { label: 'Affidavit / Verification',       icon: '✍️' },
  memo_of_parties: { label: 'Memo of Parties',                icon: '👥' },
  list_of_dates:   { label: 'List of Dates & Events',         icon: '📅' },
};

const downloadPdf = (b64: string, filename: string) => {
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const DocumentPackCard: React.FC<{ pack: DocumentPack }> = ({ pack }) => {
  const docKeys = Object.keys(pack.documents);

  const handleDownloadAll = () => {
    docKeys.forEach((key, i) => {
      setTimeout(() => {
        downloadPdf(pack.documents[key], pack.document_names[key] || `${key}.pdf`);
      }, i * 300);
    });
  };

  return (
    <div className="mt-2 border border-gray-200 rounded-xl bg-gray-50 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-gray-100">
        <FileText size={14} className="text-gray-500" />
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Filing Documents</span>
        <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
          {docKeys.length} Ready
        </span>
      </div>

      {/* Document list */}
      <div className="px-4 py-3 space-y-2">
        {docKeys.map((key) => {
          const meta = DOC_LABELS[key] || { label: key, icon: '📄' };
          const filename = pack.document_names[key] || `${key}.pdf`;
          return (
            <div
              key={key}
              className="flex items-center justify-between gap-2 px-3 py-2 bg-white border border-gray-100 rounded-lg"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">{meta.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{meta.label}</p>
                  <p className="text-[10px] text-gray-400 truncate">{filename}</p>
                </div>
              </div>
              <button
                onClick={() => downloadPdf(pack.documents[key], filename)}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-black bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                <Download size={10} />
                Download
              </button>
            </div>
          );
        })}
      </div>

      {/* Download All */}
      <div className="px-4 py-2.5 border-t border-gray-100 bg-white">
        <button
          onClick={handleDownloadAll}
          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
        >
          <Download size={12} />
          Download All Documents
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------

export const ChatInterface: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ caseId?: string }>();
  const { user } = useAuth();

  // caseId from URL param (e.g. /chat/:caseId) OR from VoiceInput location.state
  const initialTranscript: string = location.state?.transcript || '';
  const initialCaseId: string | null = params.caseId || location.state?.caseId || null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(initialCaseId);

  // Inline voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const initCalledRef = useRef(false);

  // Seed the chat with the initial transcript from VoiceInput, or load history
  useEffect(() => {
    if (initCalledRef.current) return;
    initCalledRef.current = true;

    const init = async () => {
      // If we have a caseId, load existing conversation from DB
      if (initialCaseId) {
        try {
          const API_BASE = import.meta.env.VITE_API_URL || '';
          const res = await fetch(`${API_BASE}/api/chat/history/${initialCaseId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.messages && data.messages.length > 0) {
              const loadedMsgs: Message[] = data.messages
                .filter((m: any) => m.content && m.content.trim().length > 0)
                .map((m: any) => ({
                  id: m.id,
                  role: m.role as 'user' | 'assistant',
                  content: m.content,
                  timestamp: new Date(m.created_at),
                  emailDraft: m.metadata?.email_draft || undefined,
                  documentPack: m.metadata?.document_pack || undefined,
                }));
              setMessages(loadedMsgs);

              // If the initial voice transcript is also the first user message,
              // send it to AI only if there's no assistant reply yet
              const hasAssistantReply = loadedMsgs.some((m) => m.role === 'assistant');
              if (initialTranscript && !hasAssistantReply) {
                sendToBackend(initialTranscript, initialCaseId);
              }
              return;
            }
          }
        } catch (err) {
          console.error('Failed to load chat history:', err);
        }
      }

      // No existing history — seed from transcript or show welcome
      if (initialTranscript) {
        const msgs: Message[] = [];

        msgs.push({
          id: Date.now().toString(),
          role: 'user',
          content: initialTranscript,
          timestamp: new Date(),
        });

        setMessages(msgs);

        // Send original language text to AI — Gemini responds in the same language
        sendToBackend(initialTranscript, initialCaseId);
      } else {
        // No transcript — show welcome message
        setMessages([
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: `Hello! I'm your Niyam Guru legal assistant.\n\nTell me about your consumer issue — type below or tap the 🎤 to record a voice message.\n\nI can help you:\n• Understand your consumer rights\n• File a formal complaint\n• Estimate your case strength`,
            timestamp: new Date(),
          },
        ]);
      }
    };

    init();
  }, []); // Run once on mount

  // Auto-scroll
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  // =========================================================================
  // AI Processing — sends message to real backend, persists in Supabase
  // =========================================================================

  const sendToBackend = async (input: string, overrideCaseId?: string | null) => {
    const activeCaseId = overrideCaseId ?? caseId;
    if (!activeCaseId) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Please create a case first from the My Cases page before starting a conversation.',
          timestamp: new Date(),
        },
      ]);
      return;
    }

    setIsProcessing(true);

    try {
      const response = await apiClient.post<{
        success: boolean;
        case_id?: string;
        reply?: string;
        email_draft?: EmailDraft;
        document_pack?: DocumentPack;
        error?: string;
      }>('/api/chat/send', {
        user_id: user?.id || '',
        message: input,
        case_id: activeCaseId,
      });

      if (response.success) {
        if (response.reply && response.reply.trim()) {
          const assistantMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: response.reply,
            timestamp: new Date(),
            emailDraft: response.email_draft || undefined,
            documentPack: response.document_pack || undefined,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      } else {
        console.error('Chat API error:', response.error);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: 'I\'m sorry, I encountered an error processing your message. Please try again.',
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err) {
      console.error('Chat send error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'I\'m sorry, I couldn\'t reach the server. Please check your connection and try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  // =========================================================================
  // Text input
  // =========================================================================

  const handleSendMessage = () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    const text = inputValue.trim();
    setInputValue('');
    sendToBackend(text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // =========================================================================
  // Inline voice recording (Sarvam AI)
  // =========================================================================

  const startInlineRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access error:', err);
    }
  };

  const stopInlineRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());

      setIsRecording(false);
      setIsTranscribing(true);

      try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        formData.append('language_code', 'unknown');

        const API_BASE = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${API_BASE}/api/voice/transcribe`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          const original = data.transcript || '';
          const english = data.english_translation || null;
          const langCode = data.language_code || null;

          if (original) {
            // Add user message with the transcript
            const userMsg: Message = {
              id: Date.now().toString(),
              role: 'user',
              content: original,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, userMsg]);

            // Save voice transcript to DB
            try {
              await apiClient.post('/api/chat/voice-transcript', {
                user_id: user?.id || '',
                case_id: caseId || undefined,
                original_transcript: original,
                english_translation: english,
                language_code: langCode,
              });
            } catch (e) {
              console.error('Failed to save inline voice transcript:', e);
            }

            // Send original language text to AI
            sendToBackend(original);
          }
        } else {
          console.error('Transcription failed:', response.status);
        }
      } catch (err) {
        console.error('Transcription error:', err);
      } finally {
        setIsTranscribing(false);
      }
    };

    mediaRecorderRef.current.stop();
  };



  // =========================================================================
  // Render
  // =========================================================================

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

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/mootcourt/intro')}
              className="inline-flex items-center gap-1.5 px-4 py-3 text-gray-700 rounded-full border border-black text-sm font-medium hover:bg-[#e8e4dc] transition-colors"
            >
              Proceed to Filing
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6 pb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                  message.role === 'user' ? 'bg-gray-200' : 'bg-black'
                }`}
              >
                {message.role === 'user' ? (
                  <User size={18} className="text-gray-600" />
                ) : (
                  <Bot size={18} className="text-white" />
                )}
              </div>

              {/* Bubble */}
              <div className={`max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                <div
                  className={`inline-block px-4 py-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-black text-white rounded-tr-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>

                {/* Email Draft Preview Card */}
                {message.emailDraft && (
                  <EmailPreviewCard
                    draft={message.emailDraft}
                    onApprove={async (emailId) => {
                      try {
                        const API_BASE = import.meta.env.VITE_API_URL || '';
                        const res = await fetch(`${API_BASE}/api/chat/approve-email/${emailId}`, { method: 'POST' });
                        const data = await res.json();
                        if (data.success) {
                          setMessages((prev) =>
                            prev.map((m) =>
                              m.emailDraft?.id === emailId
                                ? { ...m, emailDraft: { ...m.emailDraft!, status: 'sent' } }
                                : m
                            )
                          );
                        } else {
                          alert(data.message || 'Failed to send email');
                        }
                      } catch {
                        alert('Network error — could not send email');
                      }
                    }}
                    onDiscard={(emailId) => {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.emailDraft?.id === emailId
                            ? { ...m, emailDraft: { ...m.emailDraft!, status: 'discarded' } }
                            : m
                        )
                      );
                    }}
                  />
                )}

                {/* Filing Documents Pack Card */}
                {message.documentPack && (
                  <DocumentPackCard pack={message.documentPack} />
                )}

                <p className="text-xs text-gray-400 mt-1 px-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isProcessing && (
            <div className="flex gap-3">
              <div className="shrink-0 w-9 h-9 rounded-full bg-black flex items-center justify-center">
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
      <div className="sticky bottom-0 bg-[#fbf7ef] border-t border-gray-200 px-6 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2.5">
            {/* Text input */}
            <div className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-black/10 focus-within:border-gray-300 transition-all">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={isRecording ? 'Recording... tap mic to stop' : 'Type your message...'}
                disabled={isRecording}
                className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none disabled:opacity-50"
              />
            </div>

            {/* Voice button */}
            <button
              onClick={isRecording ? stopInlineRecording : startInlineRecording}
              disabled={isTranscribing}
              className={`shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-200'
                  : isTranscribing
                  ? 'bg-white border border-gray-200 text-gray-400 cursor-wait'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              title={isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing...' : 'Record voice message'}
            >
              {isTranscribing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : isRecording ? (
                <MicOff size={14} />
              ) : (
                <Mic size={14} />
              )}
            </button>

            {/* Send button */}
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isProcessing || isRecording}
              className="shrink-0 h-9 w-9 rounded-xl bg-black text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
            >
              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>

          {/* Status text */}
          {isRecording && (
            <p className="text-xs text-red-500 text-center mt-2 animate-pulse">
              🔴 Recording — tap the microphone to stop
            </p>
          )}
          {isTranscribing && (
            <p className="text-xs text-gray-500 text-center mt-2">
              Transcribing with Sarvam AI...
            </p>
          )}
          {!isRecording && !isTranscribing && (
            <p className="text-xs text-gray-400 text-center mt-2">
              Niyam Guru can help you understand your consumer rights and file complaints
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
