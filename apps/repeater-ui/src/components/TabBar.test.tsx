import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TabBar } from "./TabBar.js";
import type { RepeaterTab } from "@0x0-gen/sdk";

function makeTab(overrides: Partial<RepeaterTab> = {}): RepeaterTab {
  return {
    id: "tab-1",
    name: "Tab 1",
    request: { method: "GET", url: "", headers: {}, body: null },
    history: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("TabBar", () => {
  const defaultProps = {
    tabs: [makeTab()],
    activeTabId: "tab-1",
    onTabSelect: vi.fn(),
    onTabClose: vi.fn(),
    onTabRename: vi.fn(),
    onNewTab: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders tab names", () => {
    render(<TabBar {...defaultProps} />);
    expect(screen.getByText("Tab 1")).toBeDefined();
  });

  it("renders multiple tabs", () => {
    const tabs = [
      makeTab({ id: "tab-1", name: "First" }),
      makeTab({ id: "tab-2", name: "Second" }),
    ];
    render(<TabBar {...defaultProps} tabs={tabs} />);
    expect(screen.getByText("First")).toBeDefined();
    expect(screen.getByText("Second")).toBeDefined();
  });

  it("calls onTabSelect when tab is clicked", () => {
    const tabs = [
      makeTab({ id: "tab-1", name: "Tab 1" }),
      makeTab({ id: "tab-2", name: "Tab 2" }),
    ];
    render(<TabBar {...defaultProps} tabs={tabs} activeTabId="tab-1" />);
    fireEvent.click(screen.getByText("Tab 2"));
    expect(defaultProps.onTabSelect).toHaveBeenCalledWith("tab-2");
  });

  it("calls onTabClose when close button is clicked", () => {
    render(<TabBar {...defaultProps} />);
    fireEvent.click(screen.getByTitle("Close tab"));
    expect(defaultProps.onTabClose).toHaveBeenCalledWith("tab-1");
  });

  it("calls onNewTab when + button is clicked", () => {
    render(<TabBar {...defaultProps} />);
    fireEvent.click(screen.getByTitle("New tab (Ctrl+T)"));
    expect(defaultProps.onNewTab).toHaveBeenCalled();
  });

  it("enters edit mode on double-click", () => {
    render(<TabBar {...defaultProps} />);
    fireEvent.dblClick(screen.getByText("Tab 1"));
    const input = screen.getByDisplayValue("Tab 1");
    expect(input).toBeDefined();
  });

  it("calls onTabRename when edit is committed", () => {
    render(<TabBar {...defaultProps} />);
    fireEvent.dblClick(screen.getByText("Tab 1"));
    const input = screen.getByDisplayValue("Tab 1");
    fireEvent.change(input, { target: { value: "New Name" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(defaultProps.onTabRename).toHaveBeenCalledWith("tab-1", "New Name");
  });

  it("cancels edit on Escape", () => {
    render(<TabBar {...defaultProps} />);
    fireEvent.dblClick(screen.getByText("Tab 1"));
    const input = screen.getByDisplayValue("Tab 1");
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(defaultProps.onTabRename).not.toHaveBeenCalled();
    expect(screen.getByText("Tab 1")).toBeDefined();
  });

  it("renders + button for adding new tab", () => {
    render(<TabBar {...defaultProps} />);
    expect(screen.getByText("+")).toBeDefined();
  });
});
