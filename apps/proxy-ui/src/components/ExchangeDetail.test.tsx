import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExchangeDetail } from "./ExchangeDetail.js";
import type { CapturedExchange } from "@0x0-gen/sdk";

const mockExchange: CapturedExchange = {
  id: "ex-1",
  request: {
    id: "req-1",
    timestamp: Date.now(),
    method: "POST",
    url: "http://example.com/api",
    host: "example.com",
    path: "/api",
    headers: { "content-type": "application/json", host: "example.com" },
    body: '{"key":"value"}',
    contentLength: 15,
  },
  response: {
    id: "res-1",
    requestId: "req-1",
    timestamp: Date.now(),
    statusCode: 200,
    statusMessage: "OK",
    headers: { "content-type": "application/json" },
    body: '{"result":"ok"}',
    contentLength: 15,
    duration: 100,
  },
  tags: [],
};

describe("ExchangeDetail", () => {
  it("shows placeholder when no exchange selected", () => {
    render(<ExchangeDetail exchange={null} />);
    expect(screen.getByText("Select an exchange to view details")).toBeDefined();
  });

  it("shows request pane with method and path", () => {
    render(<ExchangeDetail exchange={mockExchange} />);
    expect(screen.getByText("Request")).toBeDefined();
  });

  it("shows response pane with status", () => {
    render(<ExchangeDetail exchange={mockExchange} />);
    expect(screen.getByText(/Response 200/)).toBeDefined();
  });

  it("shows waiting message when response is null", () => {
    const exchange = { ...mockExchange, response: null };
    render(<ExchangeDetail exchange={exchange} />);
    expect(screen.getByText("Waiting for response...")).toBeDefined();
  });

  it("displays request headers", () => {
    render(<ExchangeDetail exchange={mockExchange} />);
    expect(screen.getAllByText("content-type").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("application/json").length).toBeGreaterThanOrEqual(1);
  });
});
