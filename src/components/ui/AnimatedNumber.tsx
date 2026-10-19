"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";

export function AnimatedNumber({ value, suffix = "", prefix = "", duration = 0.9 }: { value: number; suffix?: string; prefix?: string; duration?: number }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${prefix}${Math.round(v)}${suffix}`);

  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [mv, value, duration]);

  return <motion.span>{text}</motion.span>;
}
