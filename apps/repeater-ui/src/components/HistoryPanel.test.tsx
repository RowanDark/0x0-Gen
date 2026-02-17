import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HistoryPanel } from "./HistoryPanel.js";
import type { RepeaterHistoryEntry } from "@0x0-gen/sdk";

function makeEntry(id: string): RepeaterHistoryEntry {
  return {
    id,
    timestamp: Date.now(),
    request: { method: "GET", url: `http://example.com/${id}`, headers: {}, body: null },
    response: {
      statusCode: 200,
      statusMessage: "OK",
      headers: {},
      body: "OK",
      contentLength: 2,
    },
    duration: 10,
    error: null,
  };
}

describe("HistoryPanel", () => {
  const defaultProps = {
    history: [],
    selectedId: null,
    onSelect: vi.fn(),
    onClear: vi.fn(),
  };

  it("shows empty state when no history", () => {
    render(<HistoryPanel {...defaultProps} />);
    expect(screen.getByText("No history")).toBeDefined();
  });

  it("shows history count in header", () => {
    const history = [makeEntry("e1"), makeEntry("e2")];
    render(<HistoryPanel {...defaultProps} history={history} />);
    expect(screen.getByText("History (2)")).toBeDefined();
  });

  it("calls onSelect when entry is clicked", () => {
    const onSelect = vi.fn();
    const entry = makeEntry("e1");
    render(
      <HistoryPanel {...defaultProps} history={[entry]} onSelect={onSelect} />,
    );
    // Find the row by the URL title attribute
    const row = document.querySelector(`[title="${entry.request.url}"]`);
    if (row) fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith(entry);
  });

  it("calls onClear when Clear is clicked", () => {
    const onClear = vi.fn();
    const history = [makeEntry("e1")];
    render(<HistoryPanel {...defaultProps} history={history} onClear={onClear} />);
    fireEvent.click(screen.getByText("Clear"));
    expect(onClear).toHaveBeenCalled();
  });

  it("Clear button is disabled when history is empty", () => {
    render(<HistoryPanel {...defaultProps} />);
    const clearBtn = screen.getByText("Clear");
    expect((clearBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("collapses when toggle button is clicked", () => {
    render(<HistoryPanel {...defaultProps} history={[makeEntry("e1")]} />);
    // The collapse button is ›
    const toggleBtn = screen.getByText("›");
    fireEvent.click(toggleBtn);
    expect(screen.queryByText("History (1)")).toBeNull();
  });
});
