import { useEffect, useRef, useState } from "react";

/**
 * Observes a container element and reports a clamped width so charts can render
 * without relying on ResponsiveContainer.
 */
export function useContainerWidth(minWidth = 320) {
  const ref = useRef(null);
  const [width, setWidth] = useState(minWidth);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = () => {
      const next = node.getBoundingClientRect().width || 0;
      setWidth(Math.max(minWidth, Math.round(next)));
    };

    update();

    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(update);
      observer.observe(node);
    } else {
      window.addEventListener("resize", update);
    }

    return () => {
      if (observer) observer.disconnect();
      else window.removeEventListener("resize", update);
    };
  }, [minWidth]);

  return { ref, width };
}
