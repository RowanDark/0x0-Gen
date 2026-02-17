import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HistoryTable } from "./HistoryTable.js";
import type { CapturedExchange } from "@0x0-gen/sdk";

function makeExchange(overrides?: Partial<CapturedExchange>): CapturedExchange {
  return {
    id: "test-id-1",
    request: {
      id: "req-1",
      timestamp: Date.now(),
      method: "GET",
      url: "http://example.com/test",
      host: "example.com",
      path: "/test",
      headers: {},
      body: null,
      contentLength: 0,
    },
    response: {
      id: "res-1",
      requestId: "req-1",
      timestamp: Date.now(),
      statusCode: 200,
      statusMessage: "OK",
      headers: {},
      body: "OK",
      contentLength: 2,
      duration: 50,
    },
    tags: [],
    ...overrides,
  };
}

describe("HistoryTable", () => {
  it("renders table header", () => {
    render(<HistoryTable exchanges={[]} selectedId={null} onSelect={vi.fn()} />);
    expect(screen.getByText("Method")).toBeDefined();
    expect(screen.getByText("Host")).toBeDefined();
    expect(screen.getByText("Path")).toBeDefined();
    expect(screen.getByText("Status")).toBeDefined();
  });

  it("renders exchange rows", () => {
    const exchanges = [makeExchange()];
    render(<HistoryTable exchanges={exchanges} selectedId={null} onSelect={vi.fn()} />);
    expect(screen.getByText("GET")).toBeDefined();
    expect(screen.getByText("example.com")).toBeDefined();
    expect(screen.getByText("/test")).toBeDefined();
    expect(screen.getByText("200")).toBeDefined();
  });

  it("calls onSelect when row is clicked", () => {
    const exchange = makeExchange();
    const onSelect = vi.fn();
    render(<HistoryTable exchanges={[exchange]} selectedId={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("GET"));
    expect(onSelect).toHaveBeenCalledWith(exchange);
  });

  it("shows --- for pending response", () => {
    const exchange = makeExchange({ response: null });
    render(<HistoryTable exchanges={[exchange]} selectedId={null} onSelect={vi.fn()} />);
    expect(screen.getByText("---")).toBeDefined();
  });
});
