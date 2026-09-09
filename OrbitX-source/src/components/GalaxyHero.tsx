import React, { useEffect, useRef, useState } from "react";

/**
 * GalaxyHero — wraps the procedural WebGL Milky Way as an interactive hero.
 *
 * The iframe (and all ~79MB of galaxy assets) is only loaded once the user
 * scrolls close to this section (lazy), so the main site stays light and the
 * heavy 3D scene never runs in the background of the whole page.
 */
export default function GalaxyHero({
  className = "",
  height = "80vh",
}: {
  className?: string;
  height?: string;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [active, setActive] = useState(true);
  const { BASE_URL } = import.meta.env;

  // Load the galaxy only when this section enters the viewport.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || shouldLoad) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldLoad]);

  // The interactive WebGL galaxy (same-origin iframe) consumes wheel events for
  // its internal zoom, so the page never scrolls while the cursor is over the
  // hero. We bridge wheel events from inside the iframe back out to the parent
  // page so normal scrolling always works. Drag-to-orbit still works as before.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!shouldLoad || !iframe) return;

    let cleanupWheel: (() => void) | null = null;
    const onLoad = () => {
      const win = iframe.contentWindow;
      if (!win) return;
      const target = win.document.body || win.document.documentElement;
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        window.scrollBy({ top: e.deltaY || e.deltaMode, behavior: "auto" });
      };
      target.addEventListener("wheel", onWheel, { passive: false });
      cleanupWheel = () => target.removeEventListener("wheel", onWheel);
    };
    iframe.addEventListener("load", onLoad);
    return () => {
      iframe.removeEventListener("load", onLoad);
      if (cleanupWheel) cleanupWheel();
    };
  }, [shouldLoad]);

  return (
    <div
      ref={sectionRef}
      className={`relative w-full overflow-hidden select-none ${className}`}
      style={{ height }}
    >
      {shouldLoad ? (
        <iframe
          ref={iframeRef}
          src={`${BASE_URL}galaxy/index.html`}
          title="OrbitX Interactive Galaxy"
          className="absolute inset-0 w-full h-full border-0"
          loading="eager"
          allow="autoplay; fullscreen"
          onLoad={() => {}}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#03040a]">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <span className="text-xs text-gray-500 font-mono tracking-widest uppercase">
              Initializing star charts…
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
