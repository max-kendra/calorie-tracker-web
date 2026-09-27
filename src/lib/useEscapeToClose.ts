import { useEffect } from "react";

/** Calls onClose when Escape is pressed while this dialog is open.
 * Backdrop-click-to-close is handled separately, directly on each
 * dialog's own backdrop div (a plain onClick), since that doesn't need
 * a shared hook - this one specifically covers the keyboard path,
 * which nothing previously handled anywhere. */
export function useEscapeToClose(onClose: () => void) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
}