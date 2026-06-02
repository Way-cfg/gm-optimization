import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export default function GlobalSpotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const spot = document.createElement("div");
    spot.className = "global-spotlight";
    document.body.appendChild(spot);
    ref.current = spot;

    const onMove = (e: MouseEvent) => {
      if (!ref.current) return;
      gsap.to(ref.current, {
        left: e.clientX,
        top: e.clientY,
        opacity: 0.6,
        duration: 0.2,
        ease: "power2.out",
      });
    };
    const onLeave = () => {
      if (ref.current) gsap.to(ref.current, { opacity: 0, duration: 0.3 });
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      ref.current?.remove();
    };
  }, []);

  return null;
}
