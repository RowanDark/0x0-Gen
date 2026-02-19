import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EntityDetail } from "./EntityDetail.js";

const baseEntity = {
  id: "ent-1",
  projectId: "proj-1",
  importId: null,
  category: "web_assets" as const,
  type: "url" as const,
  value: "https://example.com/api/test",
  normalizedValue: "https://example.com/api/test",
  attributes: {},
  confidence: 90,
  sources: ["manual"],
  firstSeen: Date.now(),
  lastSeen: Date.now(),
  tags: [],
  notes: "",
  relationships: [],
};

const baseProps = {
  entity: baseEntity,
  loading: false,
  onClose: vi.fn(),
  onUpdateTags: vi.fn(),
  onUpdateNotes: vi.fn(),
  onDelete: vi.fn(),
  onNavigateEntity: vi.fn(),
  onAddToMapper: vi.fn(),
};

describe("EntityDetail cross-tool actions", () => {
  it("shows Send to Repeater button for URL entities", () => {
    render(<EntityDetail {...baseProps} />);
    expect(screen.getByText("Send to Repeater")).toBeTruthy();
  });

  it("shows Send to Intruder button for URL entities", () => {
    render(<EntityDetail {...baseProps} />);
    expect(screen.getByText("Send to Intruder")).toBeTruthy();
  });

  it("shows Add to Mapper button for all entities", () => {
    render(<EntityDetail {...baseProps} />);
    expect(screen.getByText("Add to Mapper")).toBeTruthy();
  });

  it("does not show Send to Repeater for non-URL entities", () => {
    const entity = { ...baseEntity, type: "domain" as const, category: "infrastructure" as const };
    render(<EntityDetail {...baseProps} entity={{ ...entity, relationships: [] }} />);
    expect(screen.queryByText("Send to Repeater")).toBeNull();
    expect(screen.queryByText("Send to Intruder")).toBeNull();
    // Add to Mapper should still be present
    expect(screen.getByText("Add to Mapper")).toBeTruthy();
  });

  it("opens Repeater in new tab when Send to Repeater clicked", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<EntityDetail {...baseProps} />);
    fireEvent.click(screen.getByText("Send to Repeater"));
    expect(openSpy).toHaveBeenCalledWith(
      `/repeater?url=${encodeURIComponent("https://example.com/api/test")}`,
      "_blank",
    );
    openSpy.mockRestore();
  });

  it("opens Intruder in new tab when Send to Intruder clicked", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<EntityDetail {...baseProps} />);
    fireEvent.click(screen.getByText("Send to Intruder"));
    expect(openSpy).toHaveBeenCalledWith(
      `/intruder?url=${encodeURIComponent("https://example.com/api/test")}`,
      "_blank",
    );
    openSpy.mockRestore();
  });

  it("calls onAddToMapper when Add to Mapper clicked", () => {
    const onAddToMapper = vi.fn();
    render(<EntityDetail {...baseProps} onAddToMapper={onAddToMapper} />);
    fireEvent.click(screen.getByText("Add to Mapper"));
    expect(onAddToMapper).toHaveBeenCalledWith("ent-1");
  });
});
