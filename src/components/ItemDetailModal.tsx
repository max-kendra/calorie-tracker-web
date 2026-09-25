import { useState } from "react";
import type { Log } from "@/api/types";
import { useDeleteLog, useUpdateLogQuantity } from "@/api/hooks";
import { logDisplayName, logQuantityLabel } from "@/lib/macros";
import { MACRO_COLORS } from "@/lib/colors";

interface ItemDetailModalProps {
  log: Log;
  onClose: () => void;
}

/** Centered modal, not a slide-over like MealDetailPanel - this is a
 * focused, form-like interaction (edit a number, or delete), so it
 * reads more like a dialog you complete and dismiss than a drill-down
 * you browse alongside other content. Openable regardless of whether
 * it was reached from the week grid directly or from within
 * MealDetailPanel (see design discussion: "clicking on an item, either
 * in the weekly view or the meal view, should open up information
 * about that item") - both paths just call the same onItemClick(log)
 * handler up in WeekView, which is what actually renders this. */
export function ItemDetailModal({ log, onClose }: ItemDetailModalProps) {
  // Pre-filled from the log's CURRENT quantity (a Decimal-as-string on
  // the backend) - edited as plain text here rather than parsed back
  // and forth on every keystroke, same reasoning as every quantity
  // input on the Android client: lets someone clear the field and
  // retype without fighting a half-parsed intermediate number.
  const [quantityInput, setQuantityInput] = useState(log.quantity);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateQuantity = useUpdateLogQuantity();
  const deleteLog = useDeleteLog();

  const imageUrl = log.image_path ? `/${log.image_path}` : null;

  function handleSave() {
    const quantity = parseFloat(quantityInput);
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    updateQuantity.mutate(
      { logId: log.id, quantity },
      { onSuccess: onClose },
    );
  }

  function handleDelete() {
    deleteLog.mutate(log.id, { onSuccess: onClose });
  }

  const quantityChanged = quantityInput.trim() !== log.quantity && quantityInput.trim() !== "";

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-40 object-cover" />
          ) : (
            <div className="w-full h-24 bg-gray-100" />
          )}

          <div className="p-4">
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-lg font-semibold text-gray-800 pr-2">{logDisplayName(log)}</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">
                &times;
              </button>
            </div>
            <div className="text-sm text-gray-500 mb-3">
              {log.kcal_logged} Cal · currently {logQuantityLabel(log)}
            </div>

            <div className="grid grid-cols-4 gap-2 text-sm mb-4">
              <div>
                <div className="font-medium" style={{ color: MACRO_COLORS.protein }}>
                  {log.protein_g_logged}g
                </div>
                <div className="text-xs text-gray-400">Protein</div>
              </div>
              <div>
                <div className="font-medium" style={{ color: MACRO_COLORS.fat }}>
                  {log.fat_g_logged}g
                </div>
                <div className="text-xs text-gray-400">Fat</div>
              </div>
              <div>
                <div className="font-medium" style={{ color: MACRO_COLORS.carbs }}>
                  {log.carbs_g_logged}g
                </div>
                <div className="text-xs text-gray-400">Carbs</div>
              </div>
              <div>
                <div className="font-medium" style={{ color: MACRO_COLORS.fiber }}>
                  {log.fiber_g_logged}g
                </div>
                <div className="text-xs text-gray-400">Fiber</div>
              </div>
            </div>

            {/* Quantity-only edit, matching PATCH /logs/{id}'s actual
                scope on the backend - no serving-size/unit picker yet
                (see LogUpdate's own doc comment: item_id/recipe_id/
                date/meal_type aren't editable this way at all). For a
                recipe log, this number is SERVINGS consumed, not
                grams (see LoggableEntryBase's quantity semantics on
                the backend) - logQuantityLabel above already displays
                that distinction, but the raw input here is
                deliberately just the raw stored number either way. */}
            <label className="block text-xs text-gray-500 mb-1">
              Quantity {log.recipe_id != null ? "(servings)" : log.serving_size_name ? `(${log.serving_size_name})` : "(g)"}
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-1"
            />
            {updateQuantity.isError && (
              <div className="text-xs text-red-500 mb-2">{(updateQuantity.error as Error).message}</div>
            )}

            <button
              onClick={handleSave}
              disabled={!quantityChanged || updateQuantity.isPending}
              className="w-full bg-blue-500 text-white rounded-lg py-2 text-sm font-medium mt-2 disabled:opacity-40 hover:bg-blue-600"
            >
              {updateQuantity.isPending ? "Saving..." : "Save"}
            </button>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full text-red-500 text-sm py-2 mt-1 hover:underline"
              >
                Delete this log
              </button>
            ) : (
              <div className="mt-2 border border-red-200 rounded-lg p-2">
                <div className="text-xs text-gray-600 mb-2">Delete this log? This can&apos;t be undone.</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 text-sm py-1.5 rounded-lg border border-gray-200"
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