import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProxyControls } from "./ProxyControls.js";

describe("ProxyControls", () => {
  const defaultProps = {
    running: false,
    port: 8080,
    captureCount: 0,
    loading: false,
    error: null,
    onStart: vi.fn().mockResolvedValue(undefined),
    onStop: vi.fn().mockResolvedValue(undefined),
    onClearHistory: vi.fn().mockResolvedValue(undefined),
  };

  it("renders start button when not running", () => {
    render(<ProxyControls {...defaultProps} />);
    expect(screen.getByText("Start")).toBeDefined();
  });

  it("renders stop button when running", () => {
    render(<ProxyControls {...defaultProps} running={true} />);
    expect(screen.getByText("Stop")).toBeDefined();
  });

  it("shows running status indicator", () => {
    render(<ProxyControls {...defaultProps} running={true} />);
    expect(screen.getByText("Running")).toBeDefined();
  });

  it("shows stopped status indicator", () => {
    render(<ProxyControls {...defaultProps} running={false} />);
    expect(screen.getByText("Stopped")).toBeDefined();
  });

  it("displays capture count", () => {
    render(<ProxyControls {...defaultProps} captureCount={42} />);
    expect(screen.getByText("42")).toBeDefined();
  });

  it("calls onStart when start button is clicked", async () => {
    render(<ProxyControls {...defaultProps} />);
    fireEvent.click(screen.getByText("Start"));
    expect(defaultProps.onStart).toHaveBeenCalled();
  });

  it("calls onStop when stop button is clicked", async () => {
    render(<ProxyControls {...defaultProps} running={true} />);
    fireEvent.click(screen.getByText("Stop"));
    expect(defaultProps.onStop).toHaveBeenCalled();
  });

  it("disables port input when running", () => {
    render(<ProxyControls {...defaultProps} running={true} />);
    const input = screen.getByDisplayValue("8080");
    expect((input as HTMLInputElement).disabled).toBe(true);
  });

  it("shows error message when present", () => {
    render(<ProxyControls {...defaultProps} error="Port in use" />);
    expect(screen.getByText("Port in use")).toBeDefined();
  });

  it("shows loading state", () => {
    render(<ProxyControls {...defaultProps} loading={true} />);
    expect(screen.getByText("...")).toBeDefined();
  });
});
