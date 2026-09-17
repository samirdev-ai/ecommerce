"use client";
import { useEffect, useRef, useState } from "react";

export function useInView<T extends HTMLElement>(
  options?: IntersectionObserverInit,
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setInView(true);
      },
      { rootMargin: "300px 0px", threshold: 0.01, ...options },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [inView, options]);
  return [ref, inView];
}
