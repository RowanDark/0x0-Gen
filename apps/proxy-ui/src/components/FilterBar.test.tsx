import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterBar, applyFilters, type FilterState } from "./FilterBar.js";

describe("FilterBar", () => {
  const defaultFilters: FilterState = {
    search: "",
    method: null,
    statusGroup: null,
  };

  it("renders search input", () => {
    render(<FilterBar filters={defaultFilters} onFilterChange={vi.fn()} />);
    expect(screen.getByPlaceholderText(/Search/)).toBeDefined();
  });

  it("renders method dropdown", () => {
    render(<FilterBar filters={defaultFilters} onFilterChange={vi.fn()} />);
    expect(screen.getByDisplayValue("All Methods")).toBeDefined();
  });

  it("renders status dropdown", () => {
    render(<FilterBar filters={defaultFilters} onFilterChange={vi.fn()} />);
    expect(screen.getByDisplayValue("All Status")).toBeDefined();
  });

  it("calls onFilterChange when search changes", () => {
    const onChange = vi.fn();
    render(<FilterBar filters={defaultFilters} onFilterChange={onChange} />);
    const input = screen.getByPlaceholderText(/Search/);
    fireEvent.change(input, { target: { value: "test" } });
    expect(onChange).toHaveBeenCalledWith({ ...defaultFilters, search: "test" });
  });

  it("shows clear button when filters are active", () => {
    const filters = { ...defaultFilters, method: "GET" };
    render(<FilterBar filters={filters} onFilterChange={vi.fn()} />);
    expect(screen.getByText("Clear")).toBeDefined();
  });

  it("does not show clear button when no filters active", () => {
    render(<FilterBar filters={defaultFilters} onFilterChange={vi.fn()} />);
    expect(screen.queryByText("Clear")).toBeNull();
  });
});

describe("applyFilters", () => {
  const exchanges: {
    request: { method: string; host: string; path: string; headers: Record<string, string>; body: string | null };
    response: { statusCode: number } | null;
  }[] = [
    {
      request: {
        method: "GET",
        host: "example.com",
        path: "/api/test",
        headers: { "content-type": "application/json" },
        body: null,
      },
      response: { statusCode: 200 },
    },
    {
      request: {
        method: "POST",
        host: "api.test.com",
        path: "/submit",
        headers: { "content-type": "text/html" },
        body: '{"data":"value"}',
      },
      response: { statusCode: 404 },
    },
    {
      request: {
        method: "GET",
        host: "example.com",
        path: "/page",
        headers: {},
        body: null,
      },
      response: { statusCode: 500 },
    },
  ];

  it("returns all exchanges with empty filters", () => {
    const result = applyFilters(exchanges, {
      search: "",
      method: null,
      statusGroup: null,
    });
    expect(result).toHaveLength(3);
  });

  it("filters by method", () => {
    const result = applyFilters(exchanges, {
      search: "",
      method: "GET",
      statusGroup: null,
    });
    expect(result).toHaveLength(2);
  });

  it("filters by status group", () => {
    const result = applyFilters(exchanges, {
      search: "",
      method: null,
      statusGroup: "4xx",
    });
    expect(result).toHaveLength(1);
    expect(result[0].response!.statusCode).toBe(404);
  });

  it("filters by search term (host)", () => {
    const result = applyFilters(exchanges, {
      search: "api.test",
      method: null,
      statusGroup: null,
    });
    expect(result).toHaveLength(1);
  });

  it("filters by search term (path)", () => {
    const result = applyFilters(exchanges, {
      search: "/api/test",
      method: null,
      statusGroup: null,
    });
    expect(result).toHaveLength(1);
  });

  it("combines multiple filters", () => {
    const result = applyFilters(exchanges, {
      search: "example",
      method: "GET",
      statusGroup: "2xx",
    });
    expect(result).toHaveLength(1);
    expect(result[0].request.path).toBe("/api/test");
  });
});
