import { useEffect, useState } from "react";

/**
 * Types out `text` one character at a time.
 * Returns the text typed so far, and whether typing has finished.
 */
export function useTypewriter(text: string, speedMs = 40, startDelayMs = 300) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    let interval: ReturnType<typeof setInterval>;
    const startTimeout = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speedMs);
    }, startDelayMs);

    return () => {
      clearTimeout(startTimeout);
      clearInterval(interval);
    };
  }, [text, speedMs, startDelayMs]);

  return { displayed, done };
}
