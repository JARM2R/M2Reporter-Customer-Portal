'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { signOut } from 'next-auth/react';

interface InactivityTimerConfig {
  /** Time in milliseconds before showing warning (default: 28 minutes) */
  warningTime?: number;
  /** Time in milliseconds before auto-logout (default: 30 minutes) */
  logoutTime?: number;
  /** Callback when warning is shown */
  onWarning?: () => void;
  /** Callback when auto-logout occurs */
  onLogout?: () => void;
}

/**
 * Hook to detect user inactivity and automatically logout
 * Shows a warning modal before logging out
 */
export function useInactivityTimer(config: InactivityTimerConfig = {}) {
  const {
    warningTime = 28 * 60 * 1000, // 28 minutes
    logoutTime = 30 * 60 * 1000,   // 30 minutes
    onWarning,
    onLogout,
  } = config;

  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const handleLogout = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    onLogout?.();
    signOut({ callbackUrl: '/login?timeout=true' });
  }, [clearAllTimers, onLogout]);

  const handleStayLoggedIn = useCallback(() => {
    setShowWarning(false);
    clearAllTimers();
    startTimers();
  }, [clearAllTimers]);

  const startCountdown = useCallback(() => {
    const warningDuration = logoutTime - warningTime;
    setTimeLeft(warningDuration);
    
    countdownTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1000) {
          clearInterval(countdownTimerRef.current!);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
  }, [logoutTime, warningTime]);

  const startTimers = useCallback(() => {
    clearAllTimers();

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      onWarning?.();
      startCountdown();
    }, warningTime);

    // Set logout timer
    logoutTimerRef.current = setTimeout(() => {
      handleLogout();
    }, logoutTime);
  }, [clearAllTimers, warningTime, logoutTime, onWarning, startCountdown, handleLogout]);

  const resetTimer = useCallback(() => {
    if (showWarning) {
      // Don't reset if warning is already showing
      return;
    }
    clearAllTimers();
    startTimers();
  }, [showWarning, clearAllTimers, startTimers]);

  useEffect(() => {
    // Start timers on mount
    startTimers();

    // Activity events to track
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Cleanup on unmount
    return () => {
      clearAllTimers();
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [startTimers, resetTimer, clearAllTimers]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return {
    showWarning,
    timeLeft: formatTime(timeLeft),
    handleStayLoggedIn,
    handleLogout,
  };
}