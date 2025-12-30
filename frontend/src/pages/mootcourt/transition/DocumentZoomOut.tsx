import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const DocumentZoomOut: React.FC = () => {
  const textContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const [showIntro, setShowIntro] = useState(true);
  const [typedText, setTypedText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingCompleteRef = useRef(false);

  const introText = `Your complaint has now been formally filed.

At this stage, the court does not decide who is right or wrong.

Its first task is to examine the record.

The complaint, affidavits, and documents submitted are reviewed as written evidence.

The judge looks for three things:
Whether the dispute falls within consumer law.
Whether the facts are supported by material on record.
Whether any clarification is required before a decision can be made.

In consumer courts, this process replaces lengthy oral arguments.

If the record is clear, the court may proceed directly to reasoning and judgment.

If gaps or ambiguities exist, the court may raise specific clarifying questions to either party.

These questions are not accusations.
They are tools to ensure fairness and accuracy.

The judge will now examine your complaint and evidence.

Please wait while the court reviews the record.`;

  // Handle video end - navigate to questions
  const handleVideoEnd = () => {
    navigate('/mootcourt/questions');
  };

  // Auto-play video when intro is dismissed
  useEffect(() => {
    if (!showIntro && videoRef.current) {
      videoRef.current.play().catch(err => {
        console.error('Video autoplay failed:', err);
      });
    }
  }, [showIntro]);

  // Typing animation effect
  useEffect(() => {
    if (!showIntro) return;

    let index = 0;
    const speed = 35; // ms per character

    typingTimerRef.current = setInterval(() => {
      setTypedText(introText.slice(0, index + 1));
      index += 1;
      if (index >= introText.length) {
        if (typingTimerRef.current) {
          clearInterval(typingTimerRef.current);
        }
        isTypingCompleteRef.current = true;
        setIsTypingComplete(true);
      }
    }, speed);

    // Handle keypress to skip typing animation
    const handleKeyPress = () => {
      if (!isTypingCompleteRef.current) {
        if (typingTimerRef.current) {
          clearInterval(typingTimerRef.current);
        }
        setTypedText(introText);
        isTypingCompleteRef.current = true;
        setIsTypingComplete(true);
      }
    };

    // Handle click to skip typing animation
    const handleClick = () => {
      if (!isTypingCompleteRef.current) {
        if (typingTimerRef.current) {
          clearInterval(typingTimerRef.current);
        }
        setTypedText(introText);
        isTypingCompleteRef.current = true;
        setIsTypingComplete(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('click', handleClick);

    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('click', handleClick);
    };
  }, [introText, showIntro]);

  // Auto-scroll effect as text is typed
  useEffect(() => {
    if (textContainerRef.current && showIntro) {
      textContainerRef.current.scrollTo({
        top: textContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [typedText, showIntro]);

  // Intro text screen
  if (showIntro) {
    return (
      <div
        ref={textContainerRef}
        style={{
          width: '100vw',
          height: '100vh',
          background: '#fbf7ef',
          color: '#1f1f1f',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '48px 24px',
          boxSizing: 'border-box',
          overflowY: 'auto'
        }}
      >
        {/* Skip hint */}
        {!isTypingComplete && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '13px',
              fontFamily: '"Jersey 25", sans-serif',
              color: '#9a9a9a',
              letterSpacing: '0.5px',
              animation: 'fadeIn 1s ease 2s both'
            }}
          >
            Press any key or click to skip
          </div>
        )}
        <div style={{ maxWidth: 900, width: '100%', paddingBottom: '80px', marginTop: 'auto', marginBottom: 'auto' }}>
          <div
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: '19px',
              lineHeight: 1.75,
              fontFamily: '"Jersey 25", sans-serif',
              color: '#2c2c2c',
              letterSpacing: '0.01em'
            }}
          >
            {typedText}
            <span 
              style={{
                display: 'inline-block',
                width: '3px',
                height: '22px',
                backgroundColor: '#2c2c2c',
                marginLeft: '2px',
                animation: 'blink 1s step-end infinite',
                verticalAlign: 'middle',
                opacity: isTypingComplete ? 0 : 1,
                transition: 'opacity 0.3s ease'
              }}
            />
          </div>
          {isTypingComplete && (
            <div 
              style={{ 
                marginTop: 56,
                display: 'flex', 
                justifyContent: 'center'
              }}
            >
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setShowIntro(false);
                }}
                style={{
                  fontSize: '16px',
                  fontFamily: '"Jersey 25", sans-serif',
                  color: '#5a5a5a',
                  cursor: 'pointer',
                  letterSpacing: '0.8px',
                  textDecoration: 'underline',
                  textDecorationThickness: '1px',
                  textUnderlineOffset: '4px',
                  transition: 'color 0.2s ease',
                  animation: 'fadeIn 0.8s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#2c2c2c';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#5a5a5a';
                }}
              >
                Click to continue
              </span>
            </div>
          )}
        </div>
        <style>{`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // Video playback screen
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        background: '#000'
      }}
    >
      <video
        ref={videoRef}
        src="/media/courtroom_docu_zoomout.mp4"
        onEnded={handleVideoEnd}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
        playsInline
        muted
      />
    </div>
  );
};

export default DocumentZoomOut;
