"use client";

import { useEffect, useState } from "react";
import { LandingContent } from "./LandingContent";
import { LandingHeader } from "./LandingHeader";
import { SplashScreen } from "./SplashScreen";

export function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [pageEntered, setPageEntered] = useState(false);
  const [contentSettled, setContentSettled] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (localStorage.getItem("hasSeenSplash")) {
      setPageEntered(true);
      setContentSettled(true);
      return;
    }

    setShowSplash(true);
  }, []);

  const finishSplash = () => {
    setShowSplash(false);
    localStorage.setItem("hasSeenSplash", "true");

    // Start the landing entrance on the next frame, after the overlay unmounts.
    requestAnimationFrame(() => setPageEntered(true));
  };

  if (!mounted) {
    return <div className="fixed inset-0 z-50 bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* A viewport-level sibling: never place this inside the reveal wrapper. */}
      <LandingHeader visible={pageEntered} />

      {/* This remains in ordinary document flow; only the landing content animates. */}
      <div
        className={[
          "min-h-screen pt-4 transition-[opacity,transform] duration-1000 ease-out",
          pageEntered
            ? contentSettled
              ? "opacity-100 transform-none"
              : "translate-y-0 opacity-100"
            : "translate-y-[18vh] opacity-0",
        ].join(" ")}
        onTransitionEnd={(event) => {
          if (pageEntered && event.propertyName === "transform") {
            setContentSettled(true);
          }
        }}
      >
        <LandingContent />
      </div>

      {showSplash && <SplashScreen onFinished={finishSplash} />}
    </div>
  );
}
