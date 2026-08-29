"use client";

import { useCallback, useState, type MouseEvent } from "react";
import { motion } from "framer-motion";

type Ripple = { id: number; x: number; y: number };

// 点一下页面(包括点在按钮上),点击处会炸开几圈会发光的光环,
// 给交互一个"高级"的手感。只用 scale/opacity 做动画(通过 framer 的
// x/y/scale 组合,不跟 Tailwind 的 translate 类冲突),GPU 友好。
export function useClickHalo() {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const trigger = useCallback((x: number, y: number) => {
    const id = Date.now() + Math.random();
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 2100);
  }, []);

  const onClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      trigger(e.clientX - rect.left, e.clientY - rect.top);
    },
    [trigger]
  );

  const field = (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute"
          style={{ left: ripple.x, top: ripple.y }}
        >
          {/* 中心的暖光晕 */}
          <motion.span
            className="absolute h-8 w-8 rounded-full bg-gradient-to-br from-gold-300/70 to-brand-400/40 blur-xl"
            style={{ x: "-50%", y: "-50%" }}
            initial={{ scale: 0, opacity: 0.9 }}
            animate={{ scale: 8, opacity: 0 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
          {/* 三圈依次扩散的光环 */}
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute h-8 w-8 rounded-full border"
              style={{
                x: "-50%",
                y: "-50%",
                borderColor: i === 0 ? "rgba(217,171,86,0.65)" : "rgba(20,179,145,0.4)",
              }}
              initial={{ scale: 0, opacity: 0.7 }}
              animate={{ scale: 24 - i * 4, opacity: 0 }}
              transition={{
                duration: 1.8 + i * 0.15,
                delay: i * 0.16,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          ))}
        </span>
      ))}
    </div>
  );

  return { field, onClick };
}
