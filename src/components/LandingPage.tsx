"use client";

import { useEffect, useState } from "react";
import { SplashScreen } from "./SplashScreen";
import { LandingContent } from "./LandingContent";

export function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [slidePageUp, setSlidePageUp] = useState(true);

  useEffect(() => {
    // Mark as mounted (prevents hydration mismatch)
    setMounted(true);
    
    // Check if the user has seen the splash screen before
    const hasSeenSplash = localStorage.getItem('hasSeenSplash');
    
    if (!hasSeenSplash) {
      // First time visitor: show splash, keep page pushed down
      setShowSplash(true);
      setSlidePageUp(false);
    } else {
      // Returning visitor: skip splash, show page immediately
      setShowSplash(false);
      setSlidePageUp(true);
    }
  }, []);

  // While checking localStorage, render a black screen so there is no flash of unstyled content
  if (!mounted) {
    return <div className="fixed inset-0 bg-background z-50" />;
  }

  return (
    <>
      {/* 1. Splash Screen Overlay */}
      {showSplash && (
        <SplashScreen 
          onFinished={() => {
            setShowSplash(false);
            setSlidePageUp(true);
            // Set the flag so they never see it again
            localStorage.setItem('hasSeenSplash', 'true');
          }} 
        />
      )}

      {/* 2. Actual Landing Page Content */}
      <div 
        className={`fixed inset-0 overflow-y-auto transition-all duration-1000 ease-out ${
          slidePageUp 
            ? 'translate-y-0 blur-none opacity-100' 
            : 'translate-y-full blur-xl opacity-0'
        }`}
      >
        <LandingContent />
      </div>
    </>
  );
}