import { useState, type ReactNode } from "react";
import type { UsdaFood } from "@/api/types";
import { useUsdaSearch, type UsdaSearchKind } from "@/api/hooks";
import { MACRO_COLORS } from "@/lib/colors";

interface UsdaSearchPanelProps {
  /** Pre-filled from whatever the person was already searching for
   * among their own items, so it's one click to run the same search
   * against USDA instead of retyping it. */
  initialQuery: string;
  onPick: (food: UsdaFood) => void;
  onBack: () => void;
}

function formatGrams(value: string | null | undefined): string | null {
  if (value == null) return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? String(Number(n.toFixed(1))) : null;
}

function MacroSummary({ food }: { food: UsdaFood }) {
  const m = food.macros;
  const kcal =
    m.kcal_100g != null && Number.isFinite(parseFloat(m.kcal_100g)) ? Math.round(parseFloat(m.kcal_100g)) : null;
  const protein = formatGrams(m.protein_100g);
  const fat = formatGrams(m.fat_100g);
  const carbs = formatGrams(m.carbs_100g);

  if (kcal == null && !protein && !fat && !carbs) {
    return <>No macros reported</>;
  }

  const dot = <span className="text-gray-300 dark:text-gray-600">{" \u00b7 "}</span>;
  const parts: ReactNode[] = [];
  if (kcal != null) parts.push(<span key="kcal">{kcal} Cal</span>);
  if (protein) parts.push(<span key="protein" style={{ color: MACRO_COLORS.protein }}>{protein}P</span>);
  if (fat) parts.push(<span key="fat" style={{ color: MACRO_COLORS.fat }}>{fat}F</span>);
  if (carbs) parts.push(<span key="carbs" style={{ color: MACRO_COLORS.carbs }}>{carbs}C</span>);

  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && dot}
          {part}
        </span>
      ))}
      {" per 100g"}
    </>
  );
}

/** Searches USDA FoodData Central on an explicit click only - never as
 * you type, and never when just switching between the two kinds. The
 * default API key is shared and capped at 30 requests/hour, so every
 * request has to be something the person deliberately asked for. */
export function UsdaSearchPanel({ initialQuery, onPick, onBack }: UsdaSearchPanelProps) {
  const [queryInput, setQueryInput] = useState(initialQuery);
  const [kind, setKind] = useState<UsdaSearchKind>("whole");
  const [submitted, setSubmitted] = useState<{ query: string; kind: UsdaSearchKind } | null>(null);

  const searchQuery = useUsdaSearch(submitted?.query ?? null, submitted?.kind ?? "whole");

  function handleSearch() {
    const trimmed = queryInput.trim();
    if (!trimmed) return;
    setSubmitted({ query: trimmed, kind });
  }

  const chipClass = (active: boolean) =>
    `px-2.5 py-1 rounded-full text-xs ${
      active
        ? "bg-blue-500 text-white"
        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
    }`;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">USDA FoodData Central</div>
        <button onClick={onBack} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
          Back to my items
        </button>
      </div>

      <div className="flex gap-1 mb-2">
        <button onClick={() => setKind("whole")} className={chipClass(kind === "whole")}>
          Whole foods
        </button>
        <button onClick={() => setKind("branded")} className={chipClass(kind === "branded")}>
          Packaged products
        </button>
      </div>

      <div className="flex gap-2 mb-2">
        <input
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search USDA..."
          className="flex-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={handleSearch}
          disabled={!queryInput.trim() || searchQuery.isFetching}
          className="px-3 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600 disabled:opacity-40"
        >
          Search
        </button>
      </div>

      {submitted == null && (
        <div className="text-xs text-gray-400 dark:text-gray-500 py-2">
          {kind === "whole"
            ? "Raw and whole foods, lab-analyzed (e.g. chicken breast, banana, rice)."
            : "Packaged products, searched by name (e.g. a specific brand's yogurt)."}
        </div>
      )}
      {searchQuery.isFetching && <div className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Searching USDA...</div>}
      {searchQuery.isError && !searchQuery.isFetching && (
        <div className="text-xs text-red-500 py-2">{(searchQuery.error as Error).message}</div>
      )}
      {searchQuery.isSuccess && !searchQuery.isFetching && (searchQuery.data ?? []).length === 0 && (
        <div className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
          No USDA results for "{submitted?.query}"
        </div>
      )}
      {!searchQuery.isFetching &&
        (searchQuery.data ?? []).map((food) => (
          <button
            key={food.fdc_id}
            onClick={() => onPick(food)}
            className="w-full text-left py-2 px-1 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
          >
            <div className="text-sm text-gray-800 dark:text-gray-100">{food.description}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              {food.brand_owner ? `${food.brand_owner} \u00b7 ` : ""}
              <MacroSummary food={food} />
            </div>
          </button>
        ))}
    </div>
  );
}