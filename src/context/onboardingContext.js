import { createContext, useContext } from "react";

export const OnboardingContext = createContext(null);

export function useOnboarding() {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error("useOnboarding must be used inside OnboardingProvider");
  return value;
}
