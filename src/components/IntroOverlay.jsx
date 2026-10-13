import { useEffect, useRef, useState } from 'react';

export default function IntroOverlay({ onFinish }) {
  const [ready, setReady] = useState(false);
  const [departing, setDeparting] = useState(false);
  const overlayRef = useRef(null);
  const timersRef = useRef({});
  const onFinishRef = useRef(onFinish);
  const closeIntroRef = useRef(null);

  onFinishRef.current = onFinish;

  const closeIntro = () => {
    if (timersRef.current.finish) return;
    window.clearTimeout(timersRef.current.enter);
    setDeparting(true);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    timersRef.current.finish = window.setTimeout(() => onFinishRef.current(), reducedMotion ? 0 : 450);
  };

  closeIntroRef.current = closeIntro;

  useEffect(() => {
    document.body.classList.add('intro-lock');
    overlayRef.current?.focus();
    const animationFrame = window.requestAnimationFrame(() => setReady(true));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    timersRef.current.enter = window.setTimeout(() => closeIntroRef.current?.(), reducedMotion ? 100 : 1100);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeIntroRef.current?.();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timersRef.current.enter);
      window.clearTimeout(timersRef.current.finish);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('intro-lock');
    };
  }, []);

  return (
    <div ref={overlayRef} tabIndex={-1} className={`intro-overlay${ready ? ' is-ready' : ''}${departing ? ' is-departing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="intro-title">
      <div className="intro-content">
        <h1 className="intro-word" id="intro-title" aria-label="EventBridge">
          <span className="intro-event" aria-hidden="true">EVENT</span>
          <span className="intro-bridge" aria-hidden="true">BRIDGE</span>
        </h1>
      </div>
    </div>
  );
}