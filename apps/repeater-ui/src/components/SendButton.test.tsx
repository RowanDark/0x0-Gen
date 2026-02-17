import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SendButton } from "./SendButton.js";

describe("SendButton", () => {
  it("renders Send text when not loading", () => {
    render(<SendButton onSend={vi.fn()} loading={false} />);
    expect(screen.getByText("Send")).toBeDefined();
  });

  it("renders Sending... when loading", () => {
    render(<SendButton onSend={vi.fn()} loading={true} />);
    expect(screen.getByText("Sending...")).toBeDefined();
  });

  it("calls onSend when clicked", () => {
    const onSend = vi.fn();
    render(<SendButton onSend={onSend} loading={false} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSend).toHaveBeenCalled();
  });

  it("is disabled when loading", () => {
    render(<SendButton onSend={vi.fn()} loading={true} />);
    const btn = screen.getByRole("button");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("is disabled when disabled prop is true", () => {
    render(<SendButton onSend={vi.fn()} loading={false} disabled={true} />);
    const btn = screen.getByRole("button");
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("does not call onSend when disabled", () => {
    const onSend = vi.fn();
    render(<SendButton onSend={onSend} loading={false} disabled={true} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSend).not.toHaveBeenCalled();
  });
});
