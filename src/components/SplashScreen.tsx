'use client';

import { useEffect, useState } from 'react';

export function SplashScreen({ onFinished }: { onFinished: () => void }) {
  const [phase, setPhase] = useState<'dark' | 'msg1' | 'msg1_out' | 'msg2' | 'cta' | 'exiting'>('dark');
  const [stars, setStars] = useState<any[]>([]);

  useEffect(() => {
    const generatedStars = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 1.5 + 0.5,
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 3,
      drift: Math.random() > 0.6,
    }));
    setStars(generatedStars);
  }, []);

  // The exact timeline sequence
  useEffect(() => {
    // 1.5s: Show Message 1
    const t1 = setTimeout(() => setPhase('msg1'), 1500);
    // 4.5s: Start fading Message 1 out
    const t2 = setTimeout(() => setPhase('msg1_out'), 4500);
    // 5.5s: Message 1 is gone, fade in Message 2
    const t3 = setTimeout(() => setPhase('msg2'), 5500);
    // 6.5s: Fade in the Click Anywhere CTA
    const t4 = setTimeout(() => setPhase('cta'), 6500);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
    };
  }, []);

  const handleClick = () => {
    if (phase !== 'exiting') {
      setPhase('exiting');
    }
  };

  useEffect(() => {
    if (phase === 'exiting') {
      const exitTimer = setTimeout(() => {
        onFinished();
      }, 1200);
      return () => clearTimeout(exitTimer);
    }
  }, [phase, onFinished]);

  return (
    <div 
      onClick={handleClick}
      className={`fixed inset-0 z-50 bg-black cursor-pointer overflow-hidden transition-opacity duration-1000 ${
        phase === 'exiting' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* STARS */}
      <div className={`transition-opacity duration-1000 ${phase === 'exiting' ? 'opacity-0' : 'opacity-100'}`}>
        {stars.map(star => (
          <div
            key={star.id}
            className={`absolute rounded-full bg-white ${star.drift ? 'animate-drift' : 'animate-twinkle'}`}
            style={{
              top: `${star.top}%`,
              left: `${star.left}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
            }}
          />
        ))}
      </div>

      {/* TEXT CONTENT - Positioned further down and absolutely layered to prevent pushing */}
      <div className="absolute inset-x-0 bottom-[10%] flex justify-center px-6">
        <div className="relative w-full max-w-md h-24 flex flex-col items-center justify-end">
          
          {/* Message 1 */}
          <div 
            className={`absolute bottom-12 transition-opacity duration-1000 ${
              phase === 'msg1' ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <p className="text-sm md:text-base font-thin text-white/80 tracking-wide animate-breathe-slow">
              Every day, you spend time looking at advertisements.
            </p>
          </div>

          {/* Message 2 */}
          <div 
            className={`absolute bottom-4 transition-opacity duration-1000 ${
              phase === 'msg2' || phase === 'cta' || phase === 'exiting' ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <p className="text-base md:text-lg font-light text-white/90 tracking-wide animate-breathe-slow">
              Shouldn't you be valued for that time?
            </p>
          </div>

          {/* CTA */}
          <div 
            className={`absolute bottom-[-20px] transition-opacity duration-1000 ${
              phase === 'cta' || phase === 'exiting' ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <p className="text-xs md:text-sm font-bold tracking-[0.3em] text-white/70 animate-pulse">
              CLICK ANYWHERE →
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}