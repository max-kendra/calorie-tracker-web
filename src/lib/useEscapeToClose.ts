import { useEffect, useRef } from "react";

// Dialogs register here in mount order, so the LAST entry is always the
// topmost one on screen. Escape only acts on that one - otherwise a
// dialog stacked over another (a confirm over a detail panel, an item
// review over the add-item search) would close BOTH on a single
// keypress, discarding whatever the lower one was holding.
const openDialogs: Array<object> = [];

export function useEscapeToClose(onClose: () => void) {
  // Ref instead of an effect dependency: always calls the latest
  // onClose without re-registering (and thus reshuffling stack order)
  // every render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const entry = {};
    openDialogs.push(entry);

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && openDialogs[openDialogs.length - 1] === entry) {
        onCloseRef.current();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      const index = openDialogs.indexOf(entry);
      if (index >= 0) openDialogs.splice(index, 1);
    };
  }, []);
}