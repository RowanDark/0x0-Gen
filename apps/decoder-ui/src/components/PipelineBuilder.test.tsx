import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PipelineBuilder } from "./PipelineBuilder.js";
import type { TransformStep } from "@0x0-gen/sdk";

describe("PipelineBuilder", () => {
  const defaultProps = {
    steps: [] as TransformStep[],
    autoRun: false,
    running: false,
    onToggleDirection: vi.fn(),
    onRemoveStep: vi.fn(),
    onReorder: vi.fn(),
    onClear: vi.fn(),
    onExecute: vi.fn(),
    onToggleAutoRun: vi.fn(),
  };

  it("renders empty state message", () => {
    render(<PipelineBuilder {...defaultProps} />);
    expect(screen.getByText("Add transforms from the picker below")).toBeTruthy();
  });

  it("renders step count in header", () => {
    render(<PipelineBuilder {...defaultProps} />);
    expect(screen.getByText("Pipeline (0)")).toBeTruthy();
  });

  it("renders steps when present", () => {
    const steps: TransformStep[] = [
      { type: "base64", direction: "encode" },
      { type: "url", direction: "decode" },
    ];
    render(<PipelineBuilder {...defaultProps} steps={steps} />);
    expect(screen.getByText("Pipeline (2)")).toBeTruthy();
    expect(screen.getByText("base64")).toBeTruthy();
    expect(screen.getByText("url")).toBeTruthy();
  });

  it("calls onExecute when Run clicked", () => {
    const onExecute = vi.fn();
    const steps: TransformStep[] = [{ type: "base64", direction: "encode" }];
    render(<PipelineBuilder {...defaultProps} steps={steps} onExecute={onExecute} />);
    fireEvent.click(screen.getByText("Run"));
    expect(onExecute).toHaveBeenCalled();
  });

  it("disables Run button when no steps", () => {
    const onExecute = vi.fn();
    render(<PipelineBuilder {...defaultProps} onExecute={onExecute} />);
    const runBtn = screen.getByText("Run");
    fireEvent.click(runBtn);
    expect(onExecute).not.toHaveBeenCalled();
  });

  it("calls onClear when Clear clicked", () => {
    const onClear = vi.fn();
    const steps: TransformStep[] = [{ type: "base64", direction: "encode" }];
    render(<PipelineBuilder {...defaultProps} steps={steps} onClear={onClear} />);
    fireEvent.click(screen.getByText("Clear"));
    expect(onClear).toHaveBeenCalled();
  });

  it("toggles auto-run checkbox", () => {
    const onToggleAutoRun = vi.fn();
    render(<PipelineBuilder {...defaultProps} onToggleAutoRun={onToggleAutoRun} />);
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(onToggleAutoRun).toHaveBeenCalled();
  });

  it("shows running indicator", () => {
    const steps: TransformStep[] = [{ type: "base64", direction: "encode" }];
    render(<PipelineBuilder {...defaultProps} steps={steps} running={true} />);
    expect(screen.getByText("...")).toBeTruthy();
  });
});
