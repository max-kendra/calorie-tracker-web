import { useState } from "react";
import type { Log } from "@/api/types";
import { useUpdateLog } from "@/api/hooks";
import { logDisplayName } from "@/lib/macros";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { ServingPicker } from "./ServingPicker";

interface QuantityEditDialogProps {
  log: Log;
  onClose: () => void;
}

/** Reached by clicking the quantity text on a row directly. Item logs
 * get the full serving picker (grams / existing serving / create new -
 * see ServingPicker); recipe logs don't have a serving-size concept at
 * all (their quantity is a SERVINGS count of the recipe itself), so
 * they just get a plain numeric field instead. */
export function QuantityEditDialog({ log, onClose }: QuantityEditDialogProps) {
  useEscapeToClose(onClose);

  const isRecipeLog = log.recipe_id != null;
  const updateLog = useUpdateLog();

  const [quantityInput, setQuantityInput] = useState(log.quantity);
  const [servingSizeId, setServingSizeId] = useState<number | null>(log.serving_size_id);

  function handleSave() {
    const quantity = parseFloat(quantityInput);
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    updateLog.mutate(
      isRecipeLog ? { logId: log.id, quantity } : { logId: log.id, quantity, servingSizeId },
      { onSuccess: onClose },
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xs p-4 pointer-events-auto">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-3 truncate">{logDisplayName(log)}</h2>

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
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm mb-2"
            autoFocus
          />

          {updateLog.isError && (
            <div className="text-xs text-red-500 mb-2">{(updateLog.error as Error).message}</div>
          )}

          <div className="flex gap-2 mt-2">
            <button onClick={onClose} className="flex-1 text-sm py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updateLog.isPending}
              className="flex-1 text-sm py-2 rounded-lg bg-blue-500 text-white disabled:opacity-40 hover:bg-blue-600"
            >
              {updateLog.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}