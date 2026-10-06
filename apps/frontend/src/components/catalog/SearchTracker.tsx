"use client";
import { useEffect } from "react";
import { track } from "@/lib/analytics";

// Reports a search and whether it found anything. "Searches with no
// results" is one of the most useful lists the store owner can have: it's
// demand they aren't serving yet.
export function SearchTracker({ search, total }: { search?: string; total: number }) {
  useEffect(() => {
    if (!search) return;
    const term = search.toLowerCase().slice(0, 100);
    track(total > 0 ? "search" : "search_no_results", { term, results: total });
  }, [search, total]);
  return null;
}
