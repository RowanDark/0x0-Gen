import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResultsTable } from "./ResultsTable.js";
import type { IntruderResult } from "@0x0-gen/sdk";

const mockResults: IntruderResult[] = [
  {
    id: "r1",
    configId: "c1",
    requestIndex: 0,
    payloads: { pos1: "admin" },
    request: "GET /test",
    response: {
      statusCode: 200,
      statusMessage: "OK",
      headers: {},
      body: "ok",
      contentLength: 2,
    },
    duration: 100,
    error: null,
    timestamp: Date.now(),
  },
  {
    id: "r2",
    configId: "c1",
    requestIndex: 1,
    payloads: { pos1: "test" },
    request: "GET /test",
    response: {
      statusCode: 404,
      statusMessage: "Not Found",
      headers: {},
      body: "not found",
      contentLength: 9,
    },
    duration: 50,
    error: null,
    timestamp: Date.now(),
  },
  {
    id: "r3",
    configId: "c1",
    requestIndex: 2,
    payloads: { pos1: "error" },
    request: "GET /test",
    response: null,
    duration: 200,
    error: "Connection refused",
    timestamp: Date.now(),
  },
];

describe("ResultsTable", () => {
  it("renders result count", () => {
    render(
      <ResultsTable
        results={mockResults}
        sortField="requestIndex"
        sortDirection="asc"
        onSort={vi.fn()}
        onSelect={vi.fn()}
        selectedId={null}
      />,
    );
    expect(screen.getByText("Results (3)")).toBeTruthy();
  });

  it("renders column headers", () => {
    render(
      <ResultsTable
        results={mockResults}
        sortField="requestIndex"
        sortDirection="asc"
        onSort={vi.fn()}
        onSelect={vi.fn()}
        selectedId={null}
      />,
    );
    expect(screen.getByText(/^#/)).toBeTruthy();
    expect(screen.getByText("Payloads")).toBeTruthy();
    expect(screen.getByText(/^Status/)).toBeTruthy();
    expect(screen.getByText(/^Length/)).toBeTruthy();
    expect(screen.getByText(/^Time/)).toBeTruthy();
  });

  it("renders payload values", () => {
    render(
      <ResultsTable
        results={mockResults}
        sortField="requestIndex"
        sortDirection="asc"
        onSort={vi.fn()}
        onSelect={vi.fn()}
        selectedId={null}
      />,
    );
    expect(screen.getByText("admin")).toBeTruthy();
    expect(screen.getByText("test")).toBeTruthy();
  });

  it("renders status codes", () => {
    render(
      <ResultsTable
        results={mockResults}
        sortField="requestIndex"
        sortDirection="asc"
        onSort={vi.fn()}
        onSelect={vi.fn()}
        selectedId={null}
      />,
    );
    expect(screen.getByText("200")).toBeTruthy();
    expect(screen.getByText("404")).toBeTruthy();
    expect(screen.getByText("ERR")).toBeTruthy();
  });

  it("calls onSort when column clicked", () => {
    const onSort = vi.fn();
    render(
      <ResultsTable
        results={mockResults}
        sortField="requestIndex"
        sortDirection="asc"
        onSort={onSort}
        onSelect={vi.fn()}
        selectedId={null}
      />,
    );
    fireEvent.click(screen.getByText(/^Status/));
    expect(onSort).toHaveBeenCalledWith("statusCode");
  });

  it("calls onSelect when row clicked", () => {
    const onSelect = vi.fn();
    render(
      <ResultsTable
        results={mockResults}
        sortField="requestIndex"
        sortDirection="asc"
        onSort={vi.fn()}
        onSelect={onSelect}
        selectedId={null}
      />,
    );
    fireEvent.click(screen.getByText("admin"));
    expect(onSelect).toHaveBeenCalledWith("r1");
  });

  it("has export CSV button", () => {
    render(
      <ResultsTable
        results={mockResults}
        sortField="requestIndex"
        sortDirection="asc"
        onSort={vi.fn()}
        onSelect={vi.fn()}
        selectedId={null}
      />,
    );
    expect(screen.getByText("Export CSV")).toBeTruthy();
  });

  it("shows sort indicator", () => {
    render(
      <ResultsTable
        results={mockResults}
        sortField="requestIndex"
        sortDirection="asc"
        onSort={vi.fn()}
        onSelect={vi.fn()}
        selectedId={null}
      />,
    );
    expect(screen.getByText("# +")).toBeTruthy();
  });
});
