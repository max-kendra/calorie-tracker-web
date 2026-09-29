import { useState } from "react";
import { ItemEditDialog } from "./ItemEditDialog";
import { RecipeEditDialog } from "./RecipeEditDialog";
import { useEscapeToClose } from "@/lib/useEscapeToClose";

type CreateTarget = "item" | "recipe";

/** A persistent "+" in the bottom-right corner, visible on every page
 * (rendered once at the App level, not per-page) - lets the person
 * start a new item or recipe from anywhere, rather than needing to
 * first navigate to Items or Recipes and find that page's own create
 * entry point. Trips and goals already have their own dedicated
 * create buttons on their own pages, so this is scoped to the two
 * things worth reaching from anywhere (see design discussion). */
export function GlobalCreateButton() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [creating, setCreating] = useState<CreateTarget | null>(null);

  useEscapeToClose(() => setMenuOpen(false));

  function openCreate(target: CreateTarget) {
    setMenuOpen(false);
    setCreating(target);
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40">
        {menuOpen && (
          <>
            {/* Invisible click-catcher, not a dark backdrop - this is a
                small menu, not a dialog, so dimming the whole screen
                would feel heavier than the action warrants. */}
            <div className="fixed inset-0" onClick={() => setMenuOpen(false)} />
            <div className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 rounded-xl shadow-lg py-1.5 min-w-[160px]">
              <button
                onClick={() => openCreate("item")}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                New item
              </button>
              <button
                onClick={() => openCreate("recipe")}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                New recipe
              </button>
            </div>
          </>
        )}
        <button
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Create new"
          className="w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg flex items-center justify-center text-3xl leading-none"
        >
          +
        </button>
      </div>

      {creating === "item" && <ItemEditDialog itemId={null} onClose={() => setCreating(null)} />}
      {creating === "recipe" && <RecipeEditDialog recipeId={null} onClose={() => setCreating(null)} />}
    </>
  );
}