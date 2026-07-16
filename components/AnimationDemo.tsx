"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { gsap, useGSAP } from "@/lib/gsap";

// Démo : GSAP (useGSAP) + framer-motion côté à côté.
export function AnimationDemo() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(".gsap-box", {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
      });
    },
    { scope: container },
  );

  return (
    <div ref={container} className="flex flex-col gap-8 p-8">
      <div className="flex gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="gsap-box h-20 w-20 rounded-xl bg-indigo-500"
          />
        ))}
      </div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="h-20 w-20 rounded-xl bg-emerald-500"
      />
    </div>
  );
}
