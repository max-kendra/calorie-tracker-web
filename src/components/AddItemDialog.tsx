import { useEffect, useState } from "react";
import type { Item, ItemType, MealType, Recipe, RecipeType } from "@/api/types";
import { useCreateLog, useItemSearch, useRecipeSearch } from "@/api/hooks";
import { parseDecimal } from "@/lib/format";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { ServingPicker } from "./ServingPicker";

interface AddItemDialogProps {
  date: string;
  mealType: MealType;
  onClose: () => void;
}

type FilterChip = "all" | "product" | "ingredient" | "recipe" | "meal";

const FILTER_LABELS: Record<FilterChip, string> = {
  all: "All",
  product: "Product",
  ingredient: "Ingredient",
  recipe: "Recipe",
  meal: "Meal",
};

interface ResultRow {
  key: string;
  id: number;
  name: string;
  kcalLabel: string;
  kind: "item" | "recipe";
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** Search + filter + confirm-quantity flow for adding a new log. Item
 * selections get the full serving picker now (grams / existing serving
 * / create new - see ServingPicker), same as editing an already-logged
 * item's quantity - this was the one remaining place still stuck at
 * plain flat grams (see design discussion: "for the serving/quantity
 * edits, you should also be able to change the serving type"). Recipe
 * selections stay a plain servings-count number, unchanged - recipes
 * have no serving-size concept at all. */
export function AddItemDialog({ date, mealType, onClose }: AddItemDialogProps) {
  useEscapeToClose(onClose);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterChip>("all");
  const [selected, setSelected] = useState<{ kind: "item" | "recipe"; id: number; name: string } | null>(null);
  const [quantityInput, setQuantityInput] = useState("100");
  const [servingSizeId, setServingSizeId] = useState<number | null>(null);

  const debouncedQuery = useDebouncedValue(query, 300);

  const itemsQuery = useItemSearch(debouncedQuery);
  const recipesQuery = useRecipeSearch(debouncedQuery);
  const createLog = useCreateLog();

  const includeItems = filter === "all" || filter === "product" || filter === "ingredient";
  const includeRecipes = filter === "all" || filter === "recipe" || filter === "meal";

  const itemRows: ResultRow[] = includeItems
    ? (itemsQuery.data ?? [])
        .filter((item: Item) => filter === "all" || filter === (item.type as ItemType))
        .map((item) => ({
          key: `item-${item.id}`,
          id: item.id,
          name: item.brand ? `${item.name} (${item.brand})` : item.name,
          kcalLabel: item.kcal_100g ? `${Math.round(parseDecimal(item.kcal_100g))} Cal/100g` : "",
          kind: "item" as const,
        }))
    : [];

  const recipeRows: ResultRow[] = includeRecipes
    ? (recipesQuery.data ?? [])
        .filter((recipe: Recipe) => filter === "all" || filter === (recipe.recipe_type as RecipeType))
        .map((recipe) => ({
          key: `recipe-${recipe.recipe_id}`,
          id: recipe.recipe_id,
          name: recipe.name,
          kcalLabel: recipe.kcal_per_serving != null ? `${recipe.kcal_per_serving} Cal/serving` : "",
          kind: "recipe" as const,
        }))
    : [];

  const results = [...itemRows, ...recipeRows];
  const isSearching = itemsQuery.isFetching || recipesQuery.isFetching;

  function handleSelectResult(row: ResultRow) {
    setSelected({ kind: row.kind, id: row.id, name: row.name });
    setQuantityInput(row.kind === "item" ? "100" : "1");
    setServingSizeId(null);
  }

  function handleConfirmAdd() {
    if (!selected) return;
    const quantity = parseFloat(quantityInput);
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    createLog.mutate(
      {
        date,
        meal_type: mealType,
        quantity,
        ...(selected.kind === "item"
          ? { item_id: selected.id, serving_size_id: servingSizeId }
          : { recipe_id: selected.id }),
      },
      { onSuccess: onClose },
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[70vh] pointer-events-auto">
          {selected ? (
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 pr-2">{selected.name}</h2>
                <button onClick={() => setSelected(null)} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 text-sm">
                  &larr; Back
                </button>
              </div>

              {selected.kind === "item" && (
                <ServingPicker itemId={selected.id} selectedServingSizeId={servingSizeId} onSelect={setServingSizeId} />
              )}

              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Quantity {selected.kind === "item" ? (servingSizeId == null ? "(g)" : "") : "(servings)"}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConfirmAdd()}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm mb-2"
                autoFocus
              />
              {createLog.isError && (
                <div className="text-xs text-red-500 mb-2">{(createLog.error as Error).message}</div>
              )}
              <button
                onClick={handleConfirmAdd}
                disabled={createLog.isPending}
                className="w-full bg-blue-500 text-white rounded-lg py-2 text-sm font-medium mt-1 disabled:opacity-40 hover:bg-blue-600"
              >
                {createLog.isPending ? "Adding..." : "Add"}
              </button>
            </div>
          ) : (
            <>
              <div className="p-4 pb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search items and recipes..."
                    className="flex-1 border border-gray-200 dark:border-gray-600 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    autoFocus
                  />
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 text-xl leading-none px-1"
                  >
                    &times;
                  </button>
                </div>
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {(Object.keys(FILTER_LABELS) as FilterChip[]).map((chip) => (
                    <button
                      key={chip}
                      onClick={() => setFilter(chip)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                        filter === chip ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-900 dark:bg-gray-700 text-gray-600 dark:text-gray-300 dark:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                    >
                      {FILTER_LABELS[chip]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                {debouncedQuery.trim().length === 0 ? (
                  <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Start typing to search</div>
                ) : isSearching && results.length === 0 ? (
                  <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Searching...</div>
                ) : results.length === 0 ? (
                  <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No matches</div>
                ) : (
                  results.map((row) => (
                    <button
                      key={row.key}
                      onClick={() => handleSelectResult(row)}
                      className="w-full text-left py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-1 -mx-1 flex items-baseline justify-between gap-2"
                    >
                      <span className="text-sm text-gray-800 dark:text-gray-100 truncate">{row.name}</span>
                      {row.kcalLabel && <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{row.kcalLabel}</span>}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}