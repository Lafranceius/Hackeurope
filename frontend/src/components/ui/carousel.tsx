"use client";

import { Children, Fragment, ReactNode, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Carousel = ({ children }: { children: ReactNode }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const items = Children.toArray(children);
  const hasLoop = items.length > 1;

  const getStepSize = () => {
    const container = scrollRef.current;
    const firstChild = container?.children[0] as HTMLElement | undefined;

    if (!container || !firstChild) return 320;

    const gap = Number.parseFloat(getComputedStyle(container).columnGap || getComputedStyle(container).gap || "0");
    return firstChild.getBoundingClientRect().width + gap;
  };

  const normalizeLoopPosition = (container: HTMLDivElement) => {
    if (!hasLoop) return;

    const loopWidth = container.scrollWidth / 2;
    if (!Number.isFinite(loopWidth) || loopWidth <= 0) return;

    if (container.scrollLeft >= loopWidth) {
      container.scrollLeft -= loopWidth;
    } else if (container.scrollLeft < 0) {
      container.scrollLeft += loopWidth;
    }
  };

  const scroll = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;

    normalizeLoopPosition(container);
    const step = getStepSize();
    const delta = direction === "left" ? -step : step;
    container.scrollBy({ left: delta, behavior: "smooth" });
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !hasLoop) return;

    const handleScroll = () => normalizeLoopPosition(container);
    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasLoop]);

  useEffect(() => {
    if (paused || items.length <= 1) return;

    let frameId = 0;
    let lastTime = 0;
    let carryPixels = 0;
    const speedPxPerSecond = 80;

    const tick = (time: number) => {
      const container = scrollRef.current;
      if (!container) return;

      if (lastTime !== 0) {
        const deltaSeconds = (time - lastTime) / 1000;
        carryPixels += speedPxPerSecond * deltaSeconds;
        const wholePixels = Math.trunc(carryPixels);

        if (wholePixels !== 0) {
          container.scrollLeft += wholePixels;
          carryPixels -= wholePixels;
          normalizeLoopPosition(container);
        }
      }

      lastTime = time;
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [paused, items.length]);

  return (
    <div className="relative group" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map((child, index) => (
          <Fragment key={`item-${index}`}>{child}</Fragment>
        ))}
        {hasLoop &&
          items.map((child, index) => (
            <Fragment key={`clone-${index}`}>{child}</Fragment>
          ))}
      </div>

      <Button
        variant="secondary"
        size="sm"
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-10 w-10 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10 hidden md:flex rounded-full shadow-md bg-white border border-border text-textPrimary hover:bg-gray-50"
        onClick={() => scroll("left")}
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <Button
        variant="secondary"
        size="sm"
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-10 w-10 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10 hidden md:flex rounded-full shadow-md bg-white border border-border text-textPrimary hover:bg-gray-50"
        onClick={() => scroll("right")}
        aria-label="Scroll right"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
};
