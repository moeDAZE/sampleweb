import { useEffect, useRef, useState } from "react";
import { createInstancePathScene } from "../scenes/instancePathScene";

export function InstancePath() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    createInstancePathScene(el).then(
      (dispose) => {
        if (cancelled) dispose();
        else cleanup = dispose;
      },
      () => {
        if (!cancelled) {
          setError("当前浏览器不支持 WebGPU，请使用 Chrome 或 Edge 最新版。");
        }
      },
    );

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black px-6 text-center text-sm text-white/70">
        {error}
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}
