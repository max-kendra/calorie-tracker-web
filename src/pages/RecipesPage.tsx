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
  const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const recipesQuery = useRecipesListForEditor();
  const rows = (recipesQuery.data ?? []).filter((r) => filter === "all" || filter === (r.recipe_type as RecipeType));

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
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{recipe.kcal_per_serving ?? "-"}</td>
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