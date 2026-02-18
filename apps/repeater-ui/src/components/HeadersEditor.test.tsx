import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HeadersEditor } from "./HeadersEditor.js";

describe("HeadersEditor", () => {
  it("renders existing headers", () => {
    render(
      <HeadersEditor
        headers={{ "content-type": "application/json" }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("content-type")).toBeDefined();
    expect(screen.getByDisplayValue("application/json")).toBeDefined();
  });

  it("renders empty table when no headers", () => {
    render(<HeadersEditor headers={{}} onChange={vi.fn()} />);
    expect(screen.getByText("+ Add header")).toBeDefined();
  });

  it("calls onChange when header value changes", () => {
    const onChange = vi.fn();
    render(
      <HeadersEditor headers={{ accept: "text/html" }} onChange={onChange} />,
    );
    const input = screen.getByDisplayValue("text/html");
    fireEvent.change(input, { target: { value: "application/json" } });
    expect(onChange).toHaveBeenCalled();
    const arg = onChange.mock.calls[0][0] as Record<string, string>;
    expect(arg["accept"]).toBe("application/json");
  });

  it("adds a new row when Add header is clicked", () => {
    const onChange = vi.fn();
    render(<HeadersEditor headers={{}} onChange={onChange} />);
    fireEvent.click(screen.getByText("+ Add header"));
    const inputs = screen.getAllByPlaceholderText("Header name");
    expect(inputs.length).toBe(1);
  });

  it("removes a row when × is clicked", () => {
    const onChange = vi.fn();
    render(
      <HeadersEditor headers={{ "x-custom": "value" }} onChange={onChange} />,
    );
    const deleteBtn = screen.getByTitle("Remove header");
    fireEvent.click(deleteBtn);
    expect(onChange).toHaveBeenCalledWith({});
  });

  it("disabling a row excludes it from onChange output", () => {
    const onChange = vi.fn();
    render(
      <HeadersEditor headers={{ authorization: "Bearer xyz" }} onChange={onChange} />,
    );
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalled();
    const arg = onChange.mock.calls[0][0] as Record<string, string>;
    expect(Object.keys(arg)).not.toContain("authorization");
  });
});
