import { useRef, useEffect, useCallback } from "react";
import { gsap } from "gsap";

const GLOW_COLOR = "255, 85, 0";

export default function GlowCard({
  children,
  className = "",
  particles = false,
  tilt = false,
  magnetism = false,
  ripple = false,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  particles?: boolean;
  tilt?: boolean;
  magnetism?: boolean;
  ripple?: boolean;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hoveredRef = useRef(false);
  const memoized = useRef<HTMLDivElement[]>([]);
  const inited = useRef(false);

  const initParticles = useCallback(() => {
    if (inited.current || !ref.current) return;
    const { width, height } = ref.current.getBoundingClientRect();
    memoized.current = Array.from({ length: 10 }, () => {
      const el = document.createElement("div");
      el.style.cssText = `position:absolute;width:3px;height:3px;border-radius:50%;background:rgba(${GLOW_COLOR},1);box-shadow:0 0 5px rgba(${GLOW_COLOR},0.5);pointer-events:none;z-index:100;left:${Math.random()*width}px;top:${Math.random()*height}px;`;
      return el;
    });
    inited.current = true;
  }, []);

  const clearParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    particlesRef.current.forEach(p => gsap.to(p, { scale: 0, opacity: 0, duration: 0.2, ease: "back.in(1.7)", onComplete: () => p.remove() }));
    particlesRef.current = [];
  }, []);

  const spawnParticles = useCallback(() => {
    if (!ref.current || !hoveredRef.current) return;
    if (!inited.current) initParticles();
    memoized.current.forEach((p, i) => {
      const id = setTimeout(() => {
        if (!hoveredRef.current || !ref.current) return;
        const clone = p.cloneNode(true) as HTMLDivElement;
        ref.current!.appendChild(clone);
        particlesRef.current.push(clone);
        gsap.fromTo(clone, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" });
        gsap.to(clone, { x: (Math.random() - 0.5) * 60, y: (Math.random() - 0.5) * 60, rotation: Math.random() * 360, duration: 2 + Math.random() * 2, ease: "none", repeat: -1, yoyo: true });
        gsap.to(clone, { opacity: 0.3, duration: 1.5, ease: "power2.inOut", repeat: -1, yoyo: true });
      }, i * 80);
      timeoutsRef.current.push(id);
    });
  }, [initParticles]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onEnter = () => { hoveredRef.current = true; if (particles) spawnParticles(); };
    const onLeave = () => {
      hoveredRef.current = false; clearParticles();
      el.style.setProperty("--glow-intensity", "0");
      if (tilt || magnetism) gsap.to(el, { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 0.3, ease: "power2.out" });
    };
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const cx = r.width / 2, cy = r.height / 2;

      el.style.setProperty("--glow-x", `${(x / r.width) * 100}%`);
      el.style.setProperty("--glow-y", `${(y / r.height) * 100}%`);
      el.style.setProperty("--glow-intensity", "1");

      if (tilt) gsap.to(el, { rotateX: ((y - cy) / cy) * -6, rotateY: ((x - cx) / cx) * 6, duration: 0.1, ease: "power2.out", transformPerspective: 1000 });
      if (magnetism) gsap.to(el, { x: (x - cx) * 0.04, y: (y - cy) * 0.04, duration: 0.3, ease: "power2.out" });
    };
    const onClick = (e: MouseEvent) => {
      if (!ripple) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const maxD = Math.max(Math.hypot(x, y), Math.hypot(x - r.width, y), Math.hypot(x, y - r.height), Math.hypot(x - r.width, y - r.height));
      const rippleEl = document.createElement("div");
      rippleEl.style.cssText = `position:absolute;width:${maxD*2}px;height:${maxD*2}px;border-radius:50%;background:radial-gradient(circle,rgba(${GLOW_COLOR},0.25) 0%,rgba(${GLOW_COLOR},0.1) 30%,transparent 70%);left:${x-maxD}px;top:${y-maxD}px;pointer-events:none;z-index:1000;`;
      el.appendChild(rippleEl);
      gsap.fromTo(rippleEl, { scale: 0, opacity: 1 }, { scale: 1, opacity: 0, duration: 0.6, ease: "power2.out", onComplete: () => rippleEl.remove() });
    };

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("mousemove", onMove);
    el.addEventListener("click", onClick);
    return () => { hoveredRef.current = false; el.removeEventListener("mouseenter", onEnter); el.removeEventListener("mouseleave", onLeave); el.removeEventListener("mousemove", onMove); el.removeEventListener("click", onClick); clearParticles(); };
  }, [particles, tilt, magnetism, ripple, spawnParticles, clearParticles]);

  return <div ref={ref} className={`${className} relative overflow-hidden`} onClick={onClick} style={{ position: "relative", overflow: "hidden" as const }}>{children}</div>;
}
