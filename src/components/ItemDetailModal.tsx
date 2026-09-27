import { useState } from "react";
import type { Log } from "@/api/types";
import { useDeleteLog, useUpdateLog } from "@/api/hooks";
import { logDisplayName, logQuantityLabel } from "@/lib/macros";
import { MACRO_COLORS } from "@/lib/colors";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { ServingPicker } from "./ServingPicker";

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
    </>
  );
}