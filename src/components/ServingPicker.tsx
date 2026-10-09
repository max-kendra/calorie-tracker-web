import { useState } from "react";
import { useCreateServingSize, useItemDetail } from "@/api/hooks";
import { cleanDecimalString, parseDecimal } from "@/lib/format";

/** Takes the quantity currently in the caller's input and returns what
 * it should become after the serving change. */
export type QuantityConverter = (currentQuantity: string) => string;

interface ServingPickerProps {
  itemId: number;
  /** null = plain grams. */
  selectedServingSizeId: number | null;
  /** convertQuantity is meant to be handed straight to the caller's
   * quantity setter (setQuantityInput(convertQuantity)): switching into
   * a custom serving resets to 1, and switching back to grams
   * multiplies the quantity by the serving it was just on (2 slices of
   * a 30g serving becomes 60), so the amount carries over instead of
   * going back to whatever number was typed before. */
  onSelect: (servingSizeId: number | null, convertQuantity: QuantityConverter) => void;
}

const GRAMS_SENTINEL = "grams";
const NEW_SERVING_SENTINEL = "new";

/** Shared by both quantity-entry surfaces that deal with a real item
 * (as opposed to a recipe, which has no serving-size concept at all):
 * the quantity-edit dialog for an already-logged item, and the
 * add-item dialog's confirm-quantity step when logging something new.
 * Extracted so both stay consistent rather than maintaining the same
 * dropdown-plus-inline-create logic twice (see design discussion:
 * "for the serving/quantity edits, you should also be able to change
 * the serving type... a little dropdown that lets you change it from
 * grams to servings and also create new servings inside if needed"). */
export function ServingPicker({ itemId, selectedServingSizeId, onSelect }: ServingPickerProps) {
  const itemDetailQuery = useItemDetail(itemId);
  const createServingSize = useCreateServingSize();

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWeightG, setNewWeightG] = useState("");

  const servingSizes = itemDetailQuery.data?.serving_sizes ?? [];
  const selectValue = isCreatingNew
    ? NEW_SERVING_SENTINEL
    : selectedServingSizeId != null
      ? String(selectedServingSizeId)
      : GRAMS_SENTINEL;

  function converterFor(newServingSizeId: number | null): QuantityConverter {
    if (newServingSizeId != null) return () => "1";
    // Read now, while selectedServingSizeId is still the serving being
    // left - the parent hasn't re-rendered with the new value yet.
    const leaving = servingSizes.find((s) => s.id === selectedServingSizeId);
    const weightG = leaving ? parseDecimal(leaving.weight_g) : 0;
    if (weightG <= 0) return (current) => current;
    return (current) => {
      const quantity = parseFloat(current);
      if (!Number.isFinite(quantity)) return current;
      return cleanDecimalString(String(quantity * weightG));
    };
  }

  function handleSelectChange(value: string) {
    if (value === NEW_SERVING_SENTINEL) {
      setIsCreatingNew(true);
      return;
    }
    setIsCreatingNew(false);
    const newId = value === GRAMS_SENTINEL ? null : Number(value);
    onSelect(newId, converterFor(newId));
  }

  async function handleCreateServing() {
    const weightG = parseFloat(newWeightG);
    if (!newName.trim() || !Number.isFinite(weightG) || weightG <= 0) return;
    const created = await createServingSize.mutateAsync({ itemId, name: newName.trim(), weightG });
    onSelect(created.id, converterFor(created.id));
    setIsCreatingNew(false);
    setNewName("");
    setNewWeightG("");
  }

  return (
    <div>
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Serving</label>
      <select
        value={selectValue}
        onChange={(e) => handleSelectChange(e.target.value)}
        className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm mb-2"
      >
        <option value={GRAMS_SENTINEL}>Grams (g)</option>
        {servingSizes.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.weight_g}g)
          </option>
        ))}
        <option value={NEW_SERVING_SENTINEL}>+ Create new serving...</option>
      </select>

      {isCreatingNew && (
        <div className="mb-2 space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Serving name, e.g. 1 slice"
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              min="0"
              value={newWeightG}
              onChange={(e) => setNewWeightG(e.target.value)}
              placeholder="Weight in grams"
              className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={handleCreateServing}
              disabled={createServingSize.isPending}
              className="px-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40"
            >
              {createServingSize.isPending ? "..." : "Add"}
            </button>
          </div>
          {createServingSize.isError && (
            <div className="text-xs text-red-500">{(createServingSize.error as Error).message}</div>
          )}
        </div>
      )}
    </div>
  );
}