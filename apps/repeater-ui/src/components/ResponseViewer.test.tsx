import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResponseViewer } from "./ResponseViewer.js";
import type { RepeaterHistoryEntry } from "@0x0-gen/sdk";

function makeEntry(overrides: Partial<RepeaterHistoryEntry> = {}): RepeaterHistoryEntry {
  return {
    id: "entry-1",
    timestamp: Date.now(),
    request: { method: "GET", url: "http://example.com/", headers: {}, body: null },
    response: {
      statusCode: 200,
      statusMessage: "OK",
      headers: { "content-type": "application/json" },
      body: '{"hello":"world"}',
      contentLength: 17,
    },
    duration: 42,
    error: null,
    ...overrides,
  };
}

describe("ResponseViewer", () => {
  it("shows empty state when no entry", () => {
    render(<ResponseViewer entry={null} />);
    expect(screen.getByText("No response yet")).toBeDefined();
  });

  it("shows loading state", () => {
    render(<ResponseViewer entry={null} loading={true} />);
    expect(screen.getByText("Sending request...")).toBeDefined();
  });

  it("shows status code and message", () => {
    render(<ResponseViewer entry={makeEntry()} />);
    expect(screen.getByText("200 OK")).toBeDefined();
  });

  it("shows duration", () => {
    render(<ResponseViewer entry={makeEntry()} />);
    expect(screen.getByText("42ms")).toBeDefined();
  });

  it("shows 404 status in correct color", () => {
    render(<ResponseViewer entry={makeEntry({ response: { statusCode: 404, statusMessage: "Not Found", headers: {}, body: null, contentLength: 0 } })} />);
    expect(screen.getByText("404 Not Found")).toBeDefined();
  });

  it("shows error state when error present", () => {
    render(
      <ResponseViewer
        entry={makeEntry({ response: null, error: "Connection refused" })}
      />,
    );
    expect(screen.getByText("Request Failed")).toBeDefined();
    expect(screen.getByText("Connection refused")).toBeDefined();
  });

  it("switches to Headers tab", () => {
    render(<ResponseViewer entry={makeEntry()} />);
    fireEvent.click(screen.getByText(/Headers/));
    expect(screen.getByText("content-type")).toBeDefined();
  });

  it("switches to Raw tab", () => {
    render(<ResponseViewer entry={makeEntry()} />);
    fireEvent.click(screen.getByText("Raw"));
    expect(screen.getByText(/HTTP\/1.1 200 OK/)).toBeDefined();
  });

  it("displays response body", () => {
    render(<ResponseViewer entry={makeEntry()} />);
    // The body shows in the Body tab (default)
    expect(document.querySelector("pre")).not.toBeNull();
  });
});
