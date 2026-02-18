import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PayloadList } from "./PayloadList.js";

const baseSet = {
  id: "set-1",
  name: "Test Set",
  payloads: ["hello", "world"],
  source: "manual" as const,
};

describe("PayloadList", () => {
  it("renders set name input", () => {
    render(
      <PayloadList
        payloadSet={baseSet}
        index={0}
        onUpdate={vi.fn()}
      />,
    );
    const input = screen.getByDisplayValue("Test Set") as HTMLInputElement;
    expect(input).toBeTruthy();
  });

  it("shows payload count", () => {
    render(
      <PayloadList
        payloadSet={baseSet}
        index={0}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText("2 items")).toBeTruthy();
  });

  it("calls onUpdate when name changes", () => {
    const onUpdate = vi.fn();
    render(
      <PayloadList
        payloadSet={baseSet}
        index={0}
        onUpdate={onUpdate}
      />,
    );
    const input = screen.getByDisplayValue("Test Set");
    fireEvent.change(input, { target: { value: "New Name" } });
    expect(onUpdate).toHaveBeenCalledWith({ name: "New Name" });
  });

  it("calls onUpdate when payloads change", () => {
    const onUpdate = vi.fn();
    render(
      <PayloadList
        payloadSet={{ ...baseSet, payloads: [] }}
        index={0}
        onUpdate={onUpdate}
      />,
    );
    const textarea = screen.getByPlaceholderText("Enter payloads (one per line)");
    fireEvent.change(textarea, { target: { value: "a\nb\nc" } });
    expect(onUpdate).toHaveBeenCalledWith({ payloads: ["a", "b", "c"] });
  });

  it("shows remove button when onRemove provided", () => {
    const onRemove = vi.fn();
    render(
      <PayloadList
        payloadSet={baseSet}
        index={0}
        onUpdate={vi.fn()}
        onRemove={onRemove}
      />,
    );
    const removeBtn = screen.getByText("Remove");
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalled();
  });

  it("does not show remove button when onRemove not provided", () => {
    render(
      <PayloadList
        payloadSet={baseSet}
        index={0}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.queryByText("Remove")).toBeNull();
  });

  it("has built-in list dropdown", () => {
    render(
      <PayloadList
        payloadSet={baseSet}
        index={0}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText("Load built-in...")).toBeTruthy();
  });

  it("has dedup and sort buttons", () => {
    render(
      <PayloadList
        payloadSet={baseSet}
        index={0}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText("Dedup")).toBeTruthy();
    expect(screen.getByText("Sort")).toBeTruthy();
  });
});
