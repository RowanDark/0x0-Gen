import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toolbar } from "@0x0-gen/mapper-components";

describe("Mapper Toolbar", () => {
  const baseProps = {
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onFitToScreen: vi.fn(),
    onResetView: vi.fn(),
    zoom: 1,
  };

  it("renders zoom controls", () => {
    render(<Toolbar {...baseProps} />);
    expect(screen.getByText("+")).toBeTruthy();
    expect(screen.getByText("-")).toBeTruthy();
    expect(screen.getByText("Fit")).toBeTruthy();
    expect(screen.getByText("Reset")).toBeTruthy();
  });

  it("displays zoom percentage", () => {
    render(<Toolbar {...baseProps} zoom={1.5} />);
    expect(screen.getByText("150%")).toBeTruthy();
  });

  it("calls onZoomIn when + clicked", () => {
    const onZoomIn = vi.fn();
    render(<Toolbar {...baseProps} onZoomIn={onZoomIn} />);
    fireEvent.click(screen.getByText("+"));
    expect(onZoomIn).toHaveBeenCalled();
  });

  it("calls onZoomOut when - clicked", () => {
    const onZoomOut = vi.fn();
    render(<Toolbar {...baseProps} onZoomOut={onZoomOut} />);
    fireEvent.click(screen.getByText("-"));
    expect(onZoomOut).toHaveBeenCalled();
  });

  it("calls onFitToScreen when Fit clicked", () => {
    const onFitToScreen = vi.fn();
    render(<Toolbar {...baseProps} onFitToScreen={onFitToScreen} />);
    fireEvent.click(screen.getByText("Fit"));
    expect(onFitToScreen).toHaveBeenCalled();
  });

  it("calls onResetView when Reset clicked", () => {
    const onResetView = vi.fn();
    render(<Toolbar {...baseProps} onResetView={onResetView} />);
    fireEvent.click(screen.getByText("Reset"));
    expect(onResetView).toHaveBeenCalled();
  });
});
