import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AttackControls } from "./AttackControls.js";

describe("AttackControls", () => {
  it("shows Start button in idle state", () => {
    render(
      <AttackControls
        status="idle"
        canStart={true}
        onStart={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("Start Attack")).toBeTruthy();
    expect(screen.getByText("Idle")).toBeTruthy();
  });

  it("disables Start when canStart is false", () => {
    render(
      <AttackControls
        status="idle"
        canStart={false}
        onStart={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const btn = screen.getByText("Start Attack") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("calls onStart when Start clicked", () => {
    const onStart = vi.fn();
    render(
      <AttackControls
        status="idle"
        canStart={true}
        onStart={onStart}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Start Attack"));
    expect(onStart).toHaveBeenCalled();
  });

  it("shows Pause and Cancel in running state", () => {
    render(
      <AttackControls
        status="running"
        canStart={false}
        onStart={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("Pause")).toBeTruthy();
    expect(screen.getByText("Cancel")).toBeTruthy();
    expect(screen.getByText("Running")).toBeTruthy();
    expect(screen.queryByText("Start Attack")).toBeNull();
  });

  it("shows Resume and Cancel in paused state", () => {
    render(
      <AttackControls
        status="paused"
        canStart={false}
        onStart={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("Resume")).toBeTruthy();
    expect(screen.getByText("Cancel")).toBeTruthy();
    expect(screen.getByText("Paused")).toBeTruthy();
  });

  it("calls onPause when Pause clicked", () => {
    const onPause = vi.fn();
    render(
      <AttackControls
        status="running"
        canStart={false}
        onStart={vi.fn()}
        onPause={onPause}
        onResume={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Pause"));
    expect(onPause).toHaveBeenCalled();
  });

  it("calls onCancel when Cancel clicked", () => {
    const onCancel = vi.fn();
    render(
      <AttackControls
        status="running"
        canStart={false}
        onStart={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows Completed status", () => {
    render(
      <AttackControls
        status="completed"
        canStart={true}
        onStart={vi.fn()}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("Completed")).toBeTruthy();
    expect(screen.getByText("Start Attack")).toBeTruthy();
  });
});
