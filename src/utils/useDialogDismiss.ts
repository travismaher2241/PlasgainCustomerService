import { useEffect } from "react";

/**
 * Closes a dialog on Escape.
 *
 * Quick Log, Schedule meeting, Meeting prep and Call prep all declared
 * role="dialog" with aria-modal but registered no key handler, so the only way
 * out was a small icon at the top right — on the full-screen preparation plan
 * that was the only exit at all. The sidebar drawer already behaved correctly;
 * this gives every dialog the same behaviour from one place.
 */
export function useDialogDismiss(isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);
}
