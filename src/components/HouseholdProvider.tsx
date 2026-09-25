"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Household, Member } from "@/lib/types";

export type HouseholdContextValue = {
  household: Household | null;
  me: Member | null;
  members: Member[];
};

const HouseholdContext = createContext<HouseholdContextValue>({ household: null, me: null, members: [] });

export function HouseholdProvider({ value, children }: { value: HouseholdContextValue; children: ReactNode }) {
  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold() {
  return useContext(HouseholdContext);
}
