"use client";

import { useEffect, useState } from "react";

export default function CursorFollower() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: fine)");
    const updateEnabled = () => setEnabled(mediaQuery.matches);
    updateEnabled();
    mediaQuery.addEventListener("change", updateEnabled);

    const moveCursor = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", moveCursor);
    return () => {
      mediaQuery.removeEventListener("change", updateEnabled);
      window.removeEventListener("mousemove", moveCursor);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      className="fixed top-0 left-0 pointer-events-none z-50 
                 w-3 h-3 rounded-full bg-[#6b2ad4] opacity-70 
                 transition-transform duration-75 ease-linear"
      style={{
        transform: `translate(${position.x - 12}px, ${position.y - 12}px)`,
      }}
    />
  );
}
