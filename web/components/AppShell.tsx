"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import Nav from "./Nav";
import Drawer from "./Drawer";
import TabBar from "./TabBar";

const SearchCtx = createContext<{ query: string; setQuery: (v: string) => void }>({
  query: "", setQuery: () => {},
});
export const useSearch = () => useContext(SearchCtx);

export default function AppShell({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState(false);

  return (
    <SearchCtx.Provider value={{ query, setQuery }}>
      <Nav query={query} setQuery={setQuery} onMenu={() => setDrawer(true)} />
      <Drawer open={drawer} onClose={() => setDrawer(false)} />
      <main className="relative z-[1] pb-[104px] pt-[68px] md:pb-16">{children}</main>
      <TabBar />
    </SearchCtx.Provider>
  );
}
