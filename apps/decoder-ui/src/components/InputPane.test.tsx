import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InputPane } from "./InputPane.js";

describe("InputPane", () => {
  const defaultProps = {
    value: "",
    onChange: vi.fn(),
    isLargeInput: false,
  };

  it("renders textarea with placeholder", () => {
    render(<InputPane {...defaultProps} />);
    expect(screen.getByPlaceholderText("Enter text to transform...")).toBeTruthy();
  });

  it("displays current value", () => {
    render(<InputPane {...defaultProps} value="Hello World" />);
    expect(screen.getByDisplayValue("Hello World")).toBeTruthy();
  });

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(<InputPane {...defaultProps} onChange={onChange} />);
    const textarea = screen.getByPlaceholderText("Enter text to transform...");
    fireEvent.change(textarea, { target: { value: "test" } });
    expect(onChange).toHaveBeenCalledWith("test");
  });

  it("shows character count", () => {
    render(<InputPane {...defaultProps} value="Hello" />);
    expect(screen.getByText("5 chars")).toBeTruthy();
  });

  it("shows byte count", () => {
    render(<InputPane {...defaultProps} value="Hello" />);
    expect(screen.getByText("5 bytes")).toBeTruthy();
  });

  it("shows large input warning", () => {
    render(<InputPane {...defaultProps} isLargeInput={true} />);
    expect(screen.getByText("Large input - auto-run disabled")).toBeTruthy();
  });

  it("clears input on Clear button click", () => {
    const onChange = vi.fn();
    render(<InputPane {...defaultProps} value="test" onChange={onChange} />);
    fireEvent.click(screen.getByText("Clear"));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("renders Paste and File buttons", () => {
    render(<InputPane {...defaultProps} />);
    expect(screen.getByText("Paste")).toBeTruthy();
    expect(screen.getByText("File")).toBeTruthy();
  });
});
