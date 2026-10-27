import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react-dom";
import type { Log } from "@/api/types";
import { useItemDetail, useUpdateLog } from "@/api/hooks";
import { logDisplayName } from "@/lib/macros";
import { MACRO_COLORS } from "@/lib/colors";
import { useEscapeToClose } from "@/lib/useEscapeToClose";
import { cleanDecimalString, parseDecimal } from "@/lib/format";
import { ServingPicker } from "./ServingPicker";

interface QuantityPopoverProps {
  log: Log;
  anchor: HTMLElement;
  onClose: () => void;
}

/** Inline quantity editor that opens under the clicked quantity text.
 * Saves on Enter or click-away, cancels on Esc. */
export function QuantityPopover({ log, anchor, onClose }: QuantityPopoverProps) {
  useEscapeToClose(onClose);

  const isRecipeLog = log.recipe_id != null;
  const updateLog = useUpdateLog();
  const itemDetail = useItemDetail(isRecipeLog ? null : log.item_id);
  const servingSizes = isRecipeLog ? [] : itemDetail.data?.serving_sizes ?? [];

  const [quantityInput, setQuantityInput] = useState(cleanDecimalString(log.quantity));
  const [servingSizeId, setServingSizeId] = useState<number | null>(log.serving_size_id);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const { refs, floatingStyles } = useFloating({
    elements: { reference: anchor },
    placement: "bottom-start",
    strategy: "fixed",
    middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    // The popover is still at its pre-positioned spot when this runs, so
    // a normal focus() would scroll the page toward it.
    inputRef.current?.focus({ preventScroll: true });
    inputRef.current?.select();
  }, []);

  const quantity = parseFloat(quantityInput);
  const valid = Number.isFinite(quantity) && quantity > 0;
  const changed = valid && (quantity !== parseFloat(log.quantity) || (!isRecipeLog && servingSizeId !== log.serving_size_id));

  function weightOf(id: number | null): number {
    if (id == null) return 1;
    const found = servingSizes.find((s) => s.id === id);
    if (found) return parseDecimal(found.weight_g);
    return id === log.serving_size_id && log.serving_size_weight_g ? parseDecimal(log.serving_size_weight_g) : 1;
  }

  const oldAmount = isRecipeLog ? parseFloat(log.quantity) : parseFloat(log.quantity) * weightOf(log.serving_size_id);
  const newAmount = isRecipeLog ? quantity : quantity * weightOf(servingSizeId);
  const ratio = valid && oldAmount > 0 ? newAmount / oldAmount : 1;
  const scaled = (v: number) => Math.round(v * ratio);

  function save() {
    if (updateLog.isPending) return;
    if (!changed) {
      onClose();
      return;
    }
    updateLog.mutate(
      isRecipeLog ? { logId: log.id, quantity } : { logId: log.id, quantity, servingSizeId },
      { onSuccess: onClose },
    );
  }

  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target) || anchor.contains(target)) return;
      saveRef.current();
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [anchor]);

  function nudge(direction: 1 | -1) {
    const step = isRecipeLog || servingSizeId != null ? 0.5 : 10;
    const next = Math.max(step, (Number.isFinite(quantity) ? quantity : 0) + direction * step);
    setQuantityInput(cleanDecimalString(String(next)));
  }

  const stepperClass =
    "w-8 h-8 shrink-0 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-lg leading-none";

  return createPortal(
    <div
      ref={(node) => {
        popoverRef.current = node;
        refs.setFloating(node);
      }}
      style={floatingStyles}
      className="z-[80] w-80 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl p-3"
    >
      <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate mb-2">{logDisplayName(log)}</div>

      <div className="flex items-center gap-1.5">
        <button onClick={() => nudge(-1)} className={stepperClass} aria-label="Decrease">
          &minus;
        </button>
        <input
          ref={inputRef}
          type="number"
          step="any"
          min="0"
          value={quantityInput}
          onChange={(e) => setQuantityInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          className="w-20 min-w-0 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-center"
        />
        <button onClick={() => nudge(1)} className={stepperClass} aria-label="Increase">
          +
        </button>
        {isRecipeLog && <span className="text-sm text-gray-500 dark:text-gray-300 pl-1">servings</span>}
      </div>

      {!isRecipeLog && log.item_id != null && (
        <div className="mt-2">
          <ServingPicker
            compact
            itemId={log.item_id}
            selectedServingSizeId={servingSizeId}
            onSelect={(id, convert) => {
              setServingSizeId(id);
              setQuantityInput(convert);
            }}
          />
        </div>
      )}

      <div className="mt-2.5 text-xs flex flex-wrap gap-x-2 gap-y-0.5 items-baseline text-gray-500 dark:text-gray-300">
        <span className="font-medium text-gray-800 dark:text-gray-100">{scaled(log.kcal_logged)} Cal</span>
        <span style={{ color: MACRO_COLORS.protein }}>{scaled(log.protein_g_logged)}P</span>
        <span style={{ color: MACRO_COLORS.fat }}>{scaled(log.fat_g_logged)}F</span>
        <span style={{ color: MACRO_COLORS.carbs }}>{scaled(log.carbs_g_logged)}C</span>
        <span style={{ color: MACRO_COLORS.fiber }}>{scaled(log.fiber_g_logged)}Fi</span>
        {changed && <span className="ml-auto">was {log.kcal_logged}</span>}
      </div>

      {updateLog.isError && <div className="text-xs text-red-500 mt-2">{(updateLog.error as Error).message}</div>}
    </div>,
    document.body,
  );
}
