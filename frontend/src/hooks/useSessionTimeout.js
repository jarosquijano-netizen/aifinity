import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook to handle session timeout after inactivity
 * @param {number} timeoutMinutes - Minutes of inactivity before logout (default: 30)
 * @param {number} warningMinutes - Minutes before timeout to show warning (default: 1)
 * @param {Function} onTimeout - Callback when timeout occurs
 * @returns {Object} - { showWarning, timeRemaining, resetTimer }
 */
export function useSessionTimeout(timeoutMinutes = 30, warningMinutes = 1, onTimeout) {
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  const resetTimer = () => {
    // Clear existing timeouts and intervals
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    // Hide warning if it was showing
    setShowWarning(false);
    setTimeRemaining(null);

    // Update last activity time
    lastActivityRef.current = Date.now();

    // Set warning timeout (show warning X minutes before logout)
    const warningTime = (timeoutMinutes - warningMinutes) * 60 * 1000;
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - lastActivityRef.current;
        const remaining = timeoutMinutes * 60 * 1000 - elapsed;
        if (remaining <= 0) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          setTimeRemaining(0);
        } else {
          setTimeRemaining(Math.ceil(remaining / 1000)); // seconds remaining
        }
      }, 1000);
      
      // Set logout timeout when warning appears
      const logoutTime = warningMinutes * 60 * 1000;
      timeoutRef.current = setTimeout(() => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        if (onTimeout) {
          onTimeout();
        }
      }, logoutTime);
    }, warningTime);

    // Set initial logout timeout (will be replaced by warning timeout if warning is shown)
    const logoutTime = timeoutMinutes * 60 * 1000;
    timeoutRef.current = setTimeout(() => {
      if (onTimeout) {
        onTimeout();
      }
    }, logoutTime);
  };

  useEffect(() => {
    // Track user activity events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      // Only reset if user was active (not just tab visibility)
      resetTimer();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Also track visibility changes (tab focus)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab became visible - check if we need to reset
        const elapsed = Date.now() - lastActivityRef.current;
        const timeoutMs = timeoutMinutes * 60 * 1000;
        if (elapsed >= timeoutMs) {
          // Already timed out
          if (onTimeout) {
            onTimeout();
          }
        } else {
          // Reset timer when tab becomes visible
          resetTimer();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [timeoutMinutes, warningMinutes, onTimeout]);

  return {
    showWarning,
    timeRemaining,
    resetTimer
  };
}

