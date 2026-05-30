"use client";

import { create } from "zustand";

type AppState = {
  query: string;
  setQuery: (query: string) => void;
};

export const useAppStore = create<AppState>((set) => ({
  query: "",
  setQuery: (query) => set({ query }),
}));
