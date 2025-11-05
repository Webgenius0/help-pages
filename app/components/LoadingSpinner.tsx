"use client";

import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  size = "md",
  text,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Animated spinner with pulsing effect */}
      <div className="relative">
        {/* Outer pulsing ring */}
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        {/* Main spinner */}
        <Loader2
          className={`${sizeClasses[size]} text-primary animate-spin relative z-10`}
        />
      </div>
      {/* Optional text */}
      {text && (
        <p className="text-sm sm:text-base text-muted-foreground animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}

