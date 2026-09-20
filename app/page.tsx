import TypeaheadSearch from "@/components/TypeaheadSearch";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-slate-900">Typeahead Search Demo</h1>
        <p className="mt-1 text-sm text-slate-500">
          Debounced search against Wikipedia&apos;s OpenSearch API. Try typing,
          then use arrow keys + Enter, or click a result.
        </p>
        <div className="mt-6">
          <TypeaheadSearch />
        </div>
      </div>
    </main>
  );
}
