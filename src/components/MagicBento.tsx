import { useRef, useEffect, useState, useCallback } from "react";
import { gsap } from "gsap";

export interface BentoCardProps {
  color?: string;
  title?: string;
  description?: string;
  label?: string;
  textAutoHide?: boolean;
  disableAnimations?: boolean;
}

export interface BentoProps {
  textAutoHide?: boolean;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  disableAnimations?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  enableTilt?: boolean;
  glowColor?: string;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
}

const DEFAULT_PARTICLE_COUNT = 10;
const DEFAULT_SPOTLIGHT_RADIUS = 280;
const DEFAULT_GLOW_COLOR = "255, 85, 0";
const MOBILE_BREAKPOINT = 768;

const cardData: BentoCardProps[] = [
  { color: "#141619", title: "Registry Optimizer", description: "Silent reg.exe tweaks for privacy, performance, and system behavior.", label: "Core Engine" },
  { color: "#141619", title: "PowerShell Engine", description: "Script-based debloating, Appx removal, service config, and cleanup tasks.", label: "Script Runner" },
  { color: "#141619", title: "Batch Dispatch", description: "Run multiple tweaks in sequence with per-item status, spinners, and summary toasts.", label: "Pipeline" },
  { color: "#141619", title: "Live Toggles", description: "Instant registry toggles that apply on click — no confirmation, no batch needed.", label: "Instant Apply" },
  { color: "#141619", title: "System Scanner", description: "Reads CPU, GPU, RAM, drives, and scan history via Rust commands.", label: "Telemetry" },
  { color: "#141619", title: "Tauri Shell", description: "All commands run silently with CREATE_NO_WINDOW. Full admin elevation on release.", label: "Backend" },
];

function createParticleElement(x: number, y: number, color: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "particle";
  el.style.cssText = `
    position: absolute; width: 4px; height: 4px; border-radius: 50%;
    background: rgba(${color}, 1); box-shadow: 0 0 6px rgba(${color}, 0.6);
    pointer-events: none; z-index: 100; left: ${x}px; top: ${y}px;
  `;
  return el;
}

function updateCardGlowProperties(card: HTMLElement, mx: number, my: number, intensity: number, radius: number) {
  const r = card.getBoundingClientRect();
  card.style.setProperty("--glow-x", `${((mx - r.left) / r.width) * 100}%`);
  card.style.setProperty("--glow-y", `${((my - r.top) / r.height) * 100}%`);
  card.style.setProperty("--glow-intensity", intensity.toString());
  card.style.setProperty("--glow-radius", `${radius}px`);
}

function ParticleCard({
  children, className = "", disableAnimations = false, style, particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR, enableTilt = true, clickEffect = false, enableMagnetism = false,
}: {
  children: React.ReactNode; className?: string; disableAnimations?: boolean; style?: React.CSSProperties;
  particleCount?: number; glowColor?: string; enableTilt?: boolean; clickEffect?: boolean; enableMagnetism?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hoveredRef = useRef(false);
  const memoized = useRef<HTMLDivElement[]>([]);
  const inited = useRef(false);

  const initParticles = useCallback(() => {
    if (inited.current || !cardRef.current) return;
    const { width, height } = cardRef.current.getBoundingClientRect();
    memoized.current = Array.from({ length: particleCount }, () => createParticleElement(Math.random() * width, Math.random() * height, glowColor));
    inited.current = true;
  }, [particleCount, glowColor]);

  const clearParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    particlesRef.current.forEach(p => {
      gsap.to(p, { scale: 0, opacity: 0, duration: 0.25, ease: "back.in(1.7)", onComplete: () => p.remove() });
    });
    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!cardRef.current || !hoveredRef.current) return;
    if (!inited.current) initParticles();
    memoized.current.forEach((p, i) => {
      const id = setTimeout(() => {
        if (!hoveredRef.current || !cardRef.current) return;
        const clone = p.cloneNode(true) as HTMLDivElement;
        cardRef.current!.appendChild(clone);
        particlesRef.current.push(clone);
        gsap.fromTo(clone, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" });
        gsap.to(clone, { x: (Math.random() - 0.5) * 80, y: (Math.random() - 0.5) * 80, rotation: Math.random() * 360, duration: 2 + Math.random() * 2, ease: "none", repeat: -1, yoyo: true });
        gsap.to(clone, { opacity: 0.3, duration: 1.5, ease: "power2.inOut", repeat: -1, yoyo: true });
      }, i * 100);
      timeoutsRef.current.push(id);
    });
  }, [initParticles]);

  useEffect(() => {
    if (disableAnimations || !cardRef.current) return;
    const el = cardRef.current;

    const onEnter = () => { hoveredRef.current = true; animateParticles(); };
    const onLeave = () => { hoveredRef.current = false; clearParticles(); gsap.to(el, { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 0.3, ease: "power2.out" }); };
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const cx = r.width / 2, cy = r.height / 2;
      if (enableTilt) gsap.to(el, { rotateX: ((y - cy) / cy) * -8, rotateY: ((x - cx) / cx) * 8, duration: 0.1, ease: "power2.out", transformPerspective: 1000 });
      if (enableMagnetism) gsap.to(el, { x: (x - cx) * 0.05, y: (y - cy) * 0.05, duration: 0.3, ease: "power2.out" });
    };
    const onClick = (e: MouseEvent) => {
      if (!clickEffect) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const maxD = Math.max(Math.hypot(x, y), Math.hypot(x - r.width, y), Math.hypot(x, y - r.height), Math.hypot(x - r.width, y - r.height));
      const ripple = document.createElement("div");
      ripple.style.cssText = `position:absolute;width:${maxD*2}px;height:${maxD*2}px;border-radius:50%;background:radial-gradient(circle,rgba(${glowColor},0.4) 0%,rgba(${glowColor},0.2) 30%,transparent 70%);left:${x-maxD}px;top:${y-maxD}px;pointer-events:none;z-index:1000;`;
      el.appendChild(ripple);
      gsap.fromTo(ripple, { scale: 0, opacity: 1 }, { scale: 1, opacity: 0, duration: 0.7, ease: "power2.out", onComplete: () => ripple.remove() });
    };

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("mousemove", onMove);
    el.addEventListener("click", onClick);
    return () => { hoveredRef.current = false; el.removeEventListener("mouseenter", onEnter); el.removeEventListener("mouseleave", onLeave); el.removeEventListener("mousemove", onMove); el.removeEventListener("click", onClick); clearParticles(); };
  }, [animateParticles, clearParticles, disableAnimations, enableTilt, enableMagnetism, clickEffect, glowColor]);

  return <div ref={cardRef} className={`${className} relative overflow-hidden`} style={{ ...style, position: "relative", overflow: "hidden" }}>{children}</div>;
}

function GlobalSpotlight({ gridRef, disableAnimations, enabled, spotlightRadius, glowColor }: {
  gridRef: React.RefObject<HTMLDivElement | null>; disableAnimations?: boolean; enabled?: boolean; spotlightRadius?: number; glowColor?: string;
}) {
  const spotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (disableAnimations || !gridRef.current || !enabled) return;
    const spot = document.createElement("div");
    spot.className = "global-spotlight";
    spot.style.cssText = `position:fixed;width:700px;height:700px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(${glowColor},0.12) 0%,rgba(${glowColor},0.06) 15%,rgba(${glowColor},0.03) 30%,transparent 60%);z-index:200;opacity:0;transform:translate(-50%,-50%);mix-blend-mode:screen;`;
    document.body.appendChild(spot);
    spotRef.current = spot;

    const onMove = (e: MouseEvent) => {
      if (!spotRef.current || !gridRef.current) return;
      const section = gridRef.current.closest(".bento-section");
      const r = section?.getBoundingClientRect();
      const inside = r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      const cards = gridRef.current.querySelectorAll(".card");
      if (!inside) {
        gsap.to(spotRef.current, { opacity: 0, duration: 0.3, ease: "power2.out" });
        cards.forEach(c => (c as HTMLElement).style.setProperty("--glow-intensity", "0"));
        return;
      }
      const prox = spotlightRadius! * 0.5;
      const fadeDist = spotlightRadius! * 0.75;
      let minDist = Infinity;
      cards.forEach(c => {
        const el = c as HTMLElement;
        const cr = el.getBoundingClientRect();
        const d = Math.max(0, Math.hypot(e.clientX - (cr.left + cr.width / 2), e.clientY - (cr.top + cr.height / 2)) - Math.max(cr.width, cr.height) / 2);
        minDist = Math.min(minDist, d);
        const intensity = d <= prox ? 1 : d <= fadeDist ? (fadeDist - d) / (fadeDist - prox) : 0;
        updateCardGlowProperties(el, e.clientX, e.clientY, intensity, spotlightRadius!);
      });
      gsap.to(spotRef.current, { left: e.clientX, top: e.clientY, duration: 0.1, ease: "power2.out" });
      gsap.to(spotRef.current, { opacity: minDist <= prox ? 0.7 : minDist <= fadeDist ? ((fadeDist - minDist) / (fadeDist - prox)) * 0.7 : 0, duration: 0.2, ease: "power2.out" });
    };
    const onLeave = () => {
      gridRef.current?.querySelectorAll(".card").forEach(c => (c as HTMLElement).style.setProperty("--glow-intensity", "0"));
      if (spotRef.current) gsap.to(spotRef.current, { opacity: 0, duration: 0.3, ease: "power2.out" });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseleave", onLeave); spotRef.current?.remove(); };
  }, [gridRef, disableAnimations, enabled, spotlightRadius, glowColor]);

  return null;
}

function useMobileDetection() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

export default function MagicBento({
  textAutoHide = true, enableStars = true, enableSpotlight = true, enableBorderGlow = true,
  disableAnimations = false, spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS, particleCount = DEFAULT_PARTICLE_COUNT,
  enableTilt = false, glowColor = DEFAULT_GLOW_COLOR, clickEffect = true, enableMagnetism = true,
}: BentoProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobileDetection();
  const disabled = disableAnimations || isMobile;

  const labelClass = "text-[11px] uppercase tracking-widest text-white/20";
  const titleClass = `text-sm font-medium text-white/70 ${textAutoHide ? "truncate" : ""}`;
  const descClass = `text-xs leading-relaxed text-white/30 ${textAutoHide ? "line-clamp-2" : ""}`;

  return (
    <>
      <style>{`
        .card--border-glow::after {
          content: ''; position: absolute; inset: 0; padding: 4px;
          background: radial-gradient(var(--glow-radius) circle at var(--glow-x) var(--glow-y),
            rgba(${glowColor}, calc(var(--glow-intensity) * 0.7)) 0%,
            rgba(${glowColor}, calc(var(--glow-intensity) * 0.3)) 30%, transparent 60%);
          border-radius: inherit;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor; mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude; pointer-events: none; z-index: 1; transition: opacity 0.3s;
        }
        .card--border-glow:hover {
          box-shadow: 0 4px 20px rgba(255,85,0,0.08), 0 0 30px rgba(${glowColor}, 0.12);
        }
        @media (min-width: 640px) {
          .bento-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
          .bento-grid { grid-template-columns: repeat(4, 1fr); }
          .bento-grid .card:nth-child(1) { grid-row: 1; grid-column: 1; }
          .bento-grid .card:nth-child(2) { grid-row: 1; grid-column: 2; }
          .bento-grid .card:nth-child(3) { grid-row: 1 / 3; grid-column: 3 / 5; }
          .bento-grid .card:nth-child(4) { grid-row: 2; grid-column: 1 / 3; }
          .bento-grid .card:nth-child(5) { grid-row: 3; grid-column: 1; }
          .bento-grid .card:nth-child(6) { grid-row: 3; grid-column: 2 / 5; }
        }
      `}</style>

      {enableSpotlight && <GlobalSpotlight gridRef={gridRef} disableAnimations={disabled} enabled={enableSpotlight} spotlightRadius={spotlightRadius} glowColor={glowColor} />}

      <div ref={gridRef} className="bento-section max-w-4xl mx-auto select-none">
        <div className="bento-grid grid gap-2">
          {cardData.map((card, i) => {
            const base = `card flex flex-col justify-between relative min-h-[180px] p-5 rounded-2xl border border-white/[0.05] overflow-hidden transition-all duration-200 hover:-translate-y-0.5 ${enableBorderGlow ? "card--border-glow" : ""}`;
            const bg = { backgroundColor: card.color || "#141619", borderColor: "rgba(255,255,255,0.05)", color: "#fff" } as React.CSSProperties;

            if (enableStars) {
              return (
                <ParticleCard key={i} className={base} style={bg} disableAnimations={disabled} particleCount={particleCount} glowColor={glowColor} enableTilt={enableTilt} clickEffect={clickEffect} enableMagnetism={enableMagnetism}>
                  <span className={labelClass}>{card.label}</span>
                  <div className="mt-auto">
                    <h3 className={titleClass}>{card.title}</h3>
                    <p className={descClass}>{card.description}</p>
                  </div>
                </ParticleCard>
              );
            }
            return (
              <div key={i} className={base} style={bg}>
                <span className={labelClass}>{card.label}</span>
                <div className="mt-auto">
                  <h3 className={titleClass}>{card.title}</h3>
                  <p className={descClass}>{card.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
