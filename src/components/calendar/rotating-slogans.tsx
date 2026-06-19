"use client";
import { useEffect, useState } from "react";

const SLOGANS = [
  "Your Community, Your Events",
  "Never Miss What Matters",
  "To Share · To Gather · To Know",
  "miinawaa · again and again",
];

export function RotatingSlogans() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIndex((prev) => (prev + 1) % SLOGANS.length); setVisible(true); }, 600);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hero__slogans" aria-hidden="true">
      <p className="hero__slogan" style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)" }}>
        {SLOGANS[index]}
      </p>
    </div>
  );
}
