import { useEscapeToClose } from "@/lib/useEscapeToClose";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  isPending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  isPending = false,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEscapeToClose(onCancel);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[60]" onClick={onCancel} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-xs p-4 pointer-events-auto">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">{title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{message}</p>
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 text-sm py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className={`flex-1 text-sm py-2 rounded-lg text-white disabled:opacity-40 ${
                danger ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {isPending ? "..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}