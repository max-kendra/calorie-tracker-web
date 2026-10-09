import { useState } from "react";
import { useEscapeToClose } from "@/lib/useEscapeToClose";

interface SaveMealDialogProps {
  defaultName: string;
  skippedCount: number;
  isPending: boolean;
  error: string | null;
  onSave: (name: string) => void;
  onCancel: () => void;
}

export function SaveMealDialog({ defaultName, skippedCount, isPending, error, onSave, onCancel }: SaveMealDialogProps) {
  useEscapeToClose(onCancel);
  const [name, setName] = useState(defaultName);
  const trimmed = name.trim();

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[60]" onClick={onCancel} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
        <form
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xs p-4 pointer-events-auto"
          onSubmit={(e) => {
            e.preventDefault();
            if (trimmed && !isPending) onSave(trimmed);
          }}
        >
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">Save as meal</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Saves these items so you can log them together again.
          </p>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Meal name"
            className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 px-3 py-2 mb-3"
          />
          {skippedCount > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {skippedCount} logged recipe{skippedCount === 1 ? "" : "s"} can't be included in a saved meal and will be skipped.
            </p>
          )}
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 text-sm py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!trimmed || isPending}
              className="flex-1 text-sm py-2 rounded-lg text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-40"
            >
              {isPending ? "..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}