import type { ClipboardEvent } from "react";

/**
 * Returns an onPaste handler that extracts an image from the
 * clipboard (e.g. a screenshot, or an image copied from another app
 * or a web page) and hands it to onImage as a plain File - the same
 * type the existing file-input upload handlers already accept, so
 * this plugs into the same uploadPhoto.mutate(file, ...) call every
 * photo upload spot already has, rather than needing its own separate
 * upload path.
 *
 * Attach to a container that can actually receive paste events -
 * paste only fires on a focused element (or one a focused child
 * bubbles up from), so this needs to sit somewhere a text field in the
 * same dialog is reachable, not on an inert div with nothing focusable
 * inside it.
 */
export function usePasteImage(onImage: (file: File) => void) {
  return function handlePaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          onImage(file);
          e.preventDefault();
          return;
        }
      }
    }
  };
}