import { useState, useEffect, memo } from 'react';

interface TypewriterProps {
  text: string;
  speed?: number;
  delay?: number;
  onComplete?: () => void;
  onUpdate?: () => void;
  className?: string;
}

export const Typewriter = memo(({
  text,
  speed = 30,
  delay = 0,
  onComplete,
  className = "",
}: TypewriterProps) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isStarted, setIsStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      setIsStarted(true);
    }, delay);
    return () => clearTimeout(startTimeout);
  }, [delay, text]);

  useEffect(() => {
    if (!isStarted) return;

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        if (onComplete) onComplete();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [isStarted, text, speed]);

  return (
    <div className={`${className} whitespace-pre-wrap`}>
      {displayedText}
      {!isComplete && isStarted && <span className="animate-pulse">|</span>}
    </div>
  );
});
