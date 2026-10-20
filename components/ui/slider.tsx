"use client";
import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & { tone?: "light" | "dark"; thumbLabel?: string }
>(({ className, tone = "dark", thumbLabel, ...props }, ref) => (
  <SliderPrimitive.Root ref={ref} className={cn("relative flex h-6 w-full touch-none select-none items-center", className)} {...props}>
    <SliderPrimitive.Track className={cn("relative h-1.5 w-full grow overflow-hidden rounded-full", tone === "dark" ? "bg-studio-line" : "bg-line")}>
      <SliderPrimitive.Range className="absolute h-full bg-signal" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      aria-label={thumbLabel}
      className="block size-5 rounded-full border-2 border-signal bg-white shadow-[0_1px_4px_rgba(8,102,255,0.35)] transition-transform hover:scale-110 focus-visible:scale-110 focus-visible:outline-2 focus-visible:outline-signal"
    />
  </SliderPrimitive.Root>
));
Slider.displayName = "Slider";
