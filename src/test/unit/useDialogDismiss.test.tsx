import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDialogDismiss } from "../../utils/useDialogDismiss";

function DialogHarness({ onClose }: { onClose: () => void }) {
  useDialogDismiss(true, onClose);
  return (
    <div data-testid="backdrop">
      <div role="dialog" aria-modal="true" aria-label="Test dialog">
        <button type="button">Inside</button>
      </div>
    </div>
  );
}

describe("useDialogDismiss", () => {
  it("closes on Escape and removes its listener after unmount", () => {
    const onClose = vi.fn();
    const view = render(<DialogHarness onClose={onClose} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    view.unmount();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on the backdrop but not on content inside the dialog", () => {
    const onClose = vi.fn();
    render(<DialogHarness onClose={onClose} />);

    fireEvent.mouseDown(screen.getByRole("button", { name: "Inside" }));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.mouseDown(screen.getByTestId("backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
