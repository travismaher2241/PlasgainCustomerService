import { useEffect, useRef } from "react";

/**
 * Closes a dialog on Escape or when the pointer lands outside every open
 * modal dialog. Keeping the backdrop behaviour here prevents each modal from
 * growing a subtly different target/currentTarget implementation.
 */
export function useDialogDismiss(isOpen: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
      }
    };

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      const openDialogs = Array.from(
        document.querySelectorAll('[role="dialog"][aria-modal="true"]')
      );
      if (openDialogs.length > 0 && !openDialogs.some((dialog) => dialog.contains(target))) {
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);
}
