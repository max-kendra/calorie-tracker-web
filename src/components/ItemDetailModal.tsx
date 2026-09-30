import { useState } from "react";
import type { Log, LoggedRecipeIngredient } from "@/api/types";
import { useDeleteLog, useUpdateLog } from "@/api/hooks";
import { logDisplayName, logQuantityLabel } from "@/lib/macros";
import { parseDecimal } from "@/lib/format";
import { MACRO_COLORS } from "@/lib/colors";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { RecipeEditDialog } from "./RecipeEditDialog";
import { ServingPicker } from "./ServingPicker";

/** Scales a frozen ingredient's logged amount back up to the FULL
 * batch, exactly as the recipe existed at the moment it was logged -
 * not "your portion", not today's possibly-edited recipe (see design
 * discussion: "when I'm cooking I usually just tap into the logged
 * instance" - a fraction of a serving is useless there, and the LIVE
 * recipe could have drifted since). Both grams_logged and
 * recipe_servings_logged are frozen at log time already, so this is
 * pure arithmetic on existing data - no new backend fields needed. */
function fullBatchGrams(ingredient: LoggedRecipeIngredient, log: Log): number | null {
  const loggedServings = parseDecimal(log.quantity);
  const recipeServingsAtLogTime = log.recipe_servings_logged != null ? parseDecimal(log.recipe_servings_logged) : null;
  if (!loggedServings || !recipeServingsAtLogTime) return null;
  return (parseDecimal(ingredient.grams) / loggedServings) * recipeServingsAtLogTime;
}

interface ItemDetailModalProps {
  log: Log;
  onClose: () => void;
}

/** The "full" dialog - image, macros, quantity/serving editing (see
 * design discussion: "i'd like the quantity edit to work on the item
 * detail card as well"), and delete. Quantity editing here uses the
 * same shared ServingPicker as the dedicated quantity-click dialog and
 * the add-item confirm step, so all three stay consistent. */
export function ItemDetailModal({ log, onClose }: ItemDetailModalProps) {
  useEscapeToClose(onClose);
  const isRecipeLog = log.recipe_id != null;
  const updateLog = useUpdateLog();
  const deleteLog = useDeleteLog();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRecipeDialog, setShowRecipeDialog] = useState(false);
  const [quantityInput, setQuantityInput] = useState(log.quantity);
  const [servingSizeId, setServingSizeId] = useState<number | null>(log.serving_size_id);

  const imageUrl = log.image_path ? `/${log.image_path}` : null;
  const quantityChanged = quantityInput !== log.quantity || servingSizeId !== log.serving_size_id;

  function handleSaveQuantity() {
    const quantity = parseFloat(quantityInput);
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    updateLog.mutate(isRecipeLog ? { logId: log.id, quantity } : { logId: log.id, quantity, servingSizeId });
  }

  function handleDelete() {
    deleteLog.mutate(log.id, { onSuccess: onClose });
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden pointer-events-auto">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-40 object-cover" />
          ) : (
            <div className="w-full h-24 bg-gray-100 dark:bg-gray-700" />
          )}

          <div className="p-4">
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 pr-2">{logDisplayName(log)}</h2>
              <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 text-xl leading-none">
                &times;
              </button>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {log.kcal_logged} Cal - {logQuantityLabel(log)}
            </div>

            <div className="grid grid-cols-4 gap-2 text-sm mb-4">
              <div>
                <div className="font-medium" style={{ color: MACRO_COLORS.protein }}>
                  {log.protein_g_logged}g
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">Protein</div>
              </div>
              <div>
                <div className="font-medium" style={{ color: MACRO_COLORS.fat }}>
                  {log.fat_g_logged}g
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">Fat</div>
              </div>
              <div>
                <div className="font-medium" style={{ color: MACRO_COLORS.carbs }}>
                  {log.carbs_g_logged}g
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">Carbs</div>
              </div>
              <div>
                <div className="font-medium" style={{ color: MACRO_COLORS.fiber }}>
                  {log.fiber_g_logged}g
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">Fiber</div>
              </div>
            </div>

            {isRecipeLog && (
              <div className="mb-4">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    Full recipe, as made that day
                  </span>
                  {log.recipe_id != null && (
                    <button
                      onClick={() => setShowRecipeDialog(true)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View current recipe
                    </button>
                  )}
                </div>
                {!log.has_ingredient_snapshot ? (
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    This log predates ingredient tracking - only the current recipe is available.
                  </div>
                ) : log.ingredients.length === 0 ? (
                  <div className="text-xs text-gray-400 dark:text-gray-500">No ingredients recorded for this log.</div>
                ) : (
                  <div className="space-y-1">
                    {log.ingredients.map((ingredient, i) => {
                      const grams = fullBatchGrams(ingredient, log);
                      return (
                        <div key={i} className="flex items-baseline justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-200">{ingredient.item_name}</span>
                          <span className="text-gray-400 dark:text-gray-500 text-xs">
                            {grams != null ? `${Math.ceil(grams)}g` : "\u2014"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {!isRecipeLog && log.item_id != null && (
              <ServingPicker itemId={log.item_id} selectedServingSizeId={servingSizeId} onSelect={setServingSizeId} />
            )}
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Quantity {isRecipeLog ? "(servings)" : servingSizeId == null ? "(g)" : ""}
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm mb-2"
            />
            {updateLog.isError && (
              <div className="text-xs text-red-500 mb-2">{(updateLog.error as Error).message}</div>
            )}
            <button
              onClick={handleSaveQuantity}
              disabled={!quantityChanged || updateLog.isPending}
              className="w-full bg-blue-500 text-white rounded-lg py-2 text-sm font-medium mb-2 disabled:opacity-40 hover:bg-blue-600"
            >
              {updateLog.isPending ? "Saving..." : "Save quantity"}
            </button>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full text-red-500 text-sm py-2 rounded-lg border border-red-200 hover:bg-red-50"
              >
                Delete this log
              </button>
            ) : (
              <div className="border border-red-200 rounded-lg p-2">
                <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">Delete this log? This can't be undone.</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 text-sm py-1.5 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteLog.isPending}
                    className="flex-1 text-sm py-1.5 rounded-lg bg-red-500 text-white disabled:opacity-40"
                  >
                    {deleteLog.isPending ? "Deleting..." : "Delete"}
                  </button>
                </div>
                {deleteLog.isError && (
                  <div className="text-xs text-red-500 mt-1">{(deleteLog.error as Error).message}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showRecipeDialog && log.recipe_id != null && (
        <RecipeEditDialog recipeId={log.recipe_id} stacked onClose={() => setShowRecipeDialog(false)} />
      )}
    </>
  );
}