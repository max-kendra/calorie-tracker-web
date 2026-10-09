import { useState } from "react";
import type { RecipeType } from "@/api/types";
import { useRecipesListForEditor } from "@/api/hooks";
import { RecipeEditDialog } from "@/components/RecipeEditDialog";

type FilterChip = "all" | "recipe" | "meal";

const FILTER_LABELS: Record<FilterChip, string> = {
  all: "All",
  recipe: "Recipe",
  meal: "Meal",
};

export function RecipesPage() {
  const [filter, setFilter] = useState<FilterChip>("all");
  const [query, setQuery] = useState("");
  const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const recipesQuery = useRecipesListForEditor();
  // Client-side, same reasoning as the item editor's own search - the
  // whole list is already loaded for the type-filter chips, so this
  // is one more in-memory pass, not a request per keystroke.
  const normalizedQuery = query.trim().toLowerCase();
  const rows = (recipesQuery.data ?? [])
    .filter((r) => filter === "all" || filter === (r.recipe_type as RecipeType))
    .filter((r) => normalizedQuery === "" || r.name.toLowerCase().includes(normalizedQuery));

  return (
    <div className="max-w-[1600px] mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Recipes</h1>
        <button
          onClick={() => {
            setEditingRecipeId(null);
            setShowDialog(true);
          }}
          className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600"
        >
          + New recipe
        </button>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search recipes..."
        className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm mb-3"
      />

      <div className="flex gap-1.5 mb-3">
        {(Object.keys(FILTER_LABELS) as FilterChip[]).map((chip) => (
          <button
            key={chip}
            onClick={() => setFilter(chip)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              filter === chip ? "bg-blue-500 text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
            }`}
          >
            {FILTER_LABELS[chip]}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700">
              <th className="px-4 py-2 font-normal">Name</th>
              <th className="px-4 py-2 font-normal">Type</th>
              <th className="px-4 py-2 font-normal">Calories/serving</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((recipe) => (
              <tr
                key={recipe.recipe_id}
                onClick={() => {
                  setEditingRecipeId(recipe.recipe_id);
                  setShowDialog(true);
                }}
                className="border-b border-gray-50 last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <td className="px-4 py-2 text-gray-800 dark:text-gray-100">{recipe.name}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400 capitalize">{recipe.recipe_type}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{recipe.totals_per_serving.kcal}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Nothing here yet</div>}
      </div>

      {showDialog && <RecipeEditDialog recipeId={editingRecipeId} onClose={() => setShowDialog(false)} />}
    </div>
  );
}