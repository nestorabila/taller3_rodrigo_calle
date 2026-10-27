import { createContext, useContext, useState } from "react";

const LayoutContext = createContext<any>(null);

export function LayoutProvider({ children }: any) {
  const [mode, setMode] = useState<"sidebar" | "navbar">("navbar");

  const [scaleMode, setScaleMode] =
    useState<"small" | "medium" | "large">("medium");

  const scales = {
    small: 0.92,
    medium: 1,
    large: 1.08,
  };

  const scale = scales[scaleMode];

  return (
    <LayoutContext.Provider
      value={{
        mode,
        setMode,
        scale,
        scaleMode,
        setScaleMode,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export const useLayout = () => useContext(LayoutContext);