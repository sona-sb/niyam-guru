import { useEffect } from 'react';

/**
 * Hook to add reveal-on-scroll animation behavior
 * Observes elements with 'reveal-on-scroll' class and adds 'is-visible' when in viewport
 */
export const useRevealOnScroll = (threshold = 0.1) => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [threshold]);
};
