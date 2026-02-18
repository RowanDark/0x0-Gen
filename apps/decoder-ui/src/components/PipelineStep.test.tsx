import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PipelineStep } from "./PipelineStep.js";

describe("PipelineStep", () => {
  const defaultProps = {
    step: { type: "base64" as const, direction: "encode" as const },
    index: 0,
    onToggleDirection: vi.fn(),
    onRemove: vi.fn(),
    onDragStart: vi.fn(),
    onDragOver: vi.fn(),
    onDrop: vi.fn(),
  };

  it("renders the step type", () => {
    render(<PipelineStep {...defaultProps} />);
    expect(screen.getByText("base64")).toBeTruthy();
  });

  it("renders the direction", () => {
    render(<PipelineStep {...defaultProps} />);
    expect(screen.getByText("encode")).toBeTruthy();
  });

  it("renders step index", () => {
    render(<PipelineStep {...defaultProps} index={2} />);
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("calls onToggleDirection when direction button clicked", () => {
    const onToggleDirection = vi.fn();
    render(<PipelineStep {...defaultProps} onToggleDirection={onToggleDirection} />);
    fireEvent.click(screen.getByText("encode"));
    expect(onToggleDirection).toHaveBeenCalled();
  });

  it("calls onRemove when remove button clicked", () => {
    const onRemove = vi.fn();
    render(<PipelineStep {...defaultProps} onRemove={onRemove} />);
    fireEvent.click(screen.getByText("×"));
    expect(onRemove).toHaveBeenCalled();
  });

  it("renders decode direction", () => {
    render(
      <PipelineStep
        {...defaultProps}
        step={{ type: "url", direction: "decode" }}
      />,
    );
    expect(screen.getByText("decode")).toBeTruthy();
    expect(screen.getByText("url")).toBeTruthy();
  });
});
