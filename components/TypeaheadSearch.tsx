"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { KeyboardEvent } from "react";

interface SearchResult {
  title: string;
  description: string;
  url: string;
}

const DEBOUNCE_MS = 300;
const MIN_CHARS = 1;

type Status = "idle" | "loading" | "success" | "empty" | "error";

export default function TypeaheadSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);

  // Guards against race conditions from out-of-order network responses
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (term: string) => {
    if (term.trim().length < MIN_CHARS) {
      setStatus("idle");
      setResults([]);
      return;
    }

    // Cancel any in-flight request before starting a new one
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const requestId = ++requestIdRef.current;
    setStatus("loading");

    try {
      // Wikipedia's OpenSearch endpoint: free, no API key, CORS-enabled via origin=*
      const res = await fetch(
        `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
          term
        )}&limit=8&namespace=0&format=json&origin=*`,
        { signal: controller.signal }
      );

      // A newer request has already fired — discard this stale response
      if (requestId !== requestIdRef.current) return;

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      // OpenSearch returns a fixed 4-tuple: [term, titles[], descriptions[], urls[]]
      const data: [string, string[], string[], string[]] = await res.json();
      if (requestId !== requestIdRef.current) return;

      const [, titles, descriptions, urls] = data;
      const mapped: SearchResult[] = titles.map((title, i) => ({
        title,
        description: descriptions[i] || "",
        url: urls[i] || "",
      }));

      setResults(mapped);
      setStatus(mapped.length ? "success" : "empty");
      setHighlightedIndex(-1);
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // expected on cancel, not a real error
      if (requestId !== requestIdRef.current) return;
      setStatus("error");
      setResults([]);
    }
  }, []);

  // Debounce: wait for the user to pause typing before firing a request
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  // Close the dropdown when clicking outside the component
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectResult = (result: SearchResult) => {
    setQuery(result.title);
    setIsOpen(false);
    setResults([]);
    setStatus("idle");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((i) => (i + 1) % results.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) selectResult(results[highlightedIndex]);
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const dropdownBase =
    "absolute left-0 right-0 top-full z-10 mt-1.5 rounded-lg border border-slate-200 bg-white p-2.5 shadow-lg shadow-slate-900/5";

  return (
    <div ref={containerRef} className="relative max-w-sm">
      <label htmlFor="wiki-search" className="mb-1.5 block text-sm font-medium text-slate-700">
        Search Wikipedia
      </label>
      <input
        id="wiki-search"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls="search-listbox"
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="e.g. Lagos"
        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition-shadow focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      />

      {isOpen && status === "loading" && (
        <div className={dropdownBase}>
          <span className="text-sm text-slate-500">Searching…</span>
        </div>
      )}

      {isOpen && status === "error" && (
        <div className={`${dropdownBase} flex items-center justify-between`}>
          <span className="text-sm text-rose-600">Something went wrong.</span>
          <button
            onClick={() => search(query)}
            className="ml-2 rounded border border-rose-300 px-2 py-0.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50"
          >
            Retry
          </button>
        </div>
      )}

      {isOpen && status === "empty" && (
        <div className={dropdownBase}>
          <span className="text-sm text-slate-500">No results match &quot;{query}&quot;.</span>
        </div>
      )}

      {isOpen && status === "success" && results.length > 0 && (
        <ul
          id="search-listbox"
          role="listbox"
          className={`${dropdownBase} max-h-72 list-none overflow-y-auto p-1.5`}
        >
          {results.map((r, i) => (
            <li
              key={r.url || r.title}
              role="option"
              aria-selected={i === highlightedIndex}
              onMouseEnter={() => setHighlightedIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                selectResult(r);
              }}
              className={`cursor-pointer rounded-md px-2.5 py-2 ${
                i === highlightedIndex ? "bg-indigo-50" : "bg-transparent"
              }`}
            >
              <div className="text-sm text-slate-800">{r.title}</div>
              {r.description && (
                <div className="truncate text-xs text-slate-400">{r.description}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
