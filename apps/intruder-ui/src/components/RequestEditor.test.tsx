import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RequestEditor } from "./RequestEditor.js";

describe("RequestEditor", () => {
  it("renders textarea with value", () => {
    render(
      <RequestEditor
        value="GET /test HTTP/1.1"
        onChange={vi.fn()}
        positions={[]}
        onAddPosition={vi.fn()}
        onRemovePosition={vi.fn()}
        onClearPositions={vi.fn()}
      />,
    );
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("GET /test HTTP/1.1");
  });

  it("calls onChange when text changes", () => {
    const onChange = vi.fn();
    render(
      <RequestEditor
        value=""
        onChange={onChange}
        positions={[]}
        onAddPosition={vi.fn()}
        onRemovePosition={vi.fn()}
        onClearPositions={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "new value" },
    });
    expect(onChange).toHaveBeenCalledWith("new value");
  });

  it("shows position count", () => {
    render(
      <RequestEditor
        value="test"
        onChange={vi.fn()}
        positions={[
          { id: "1", start: 0, end: 4, name: "pos1" },
          { id: "2", start: 5, end: 9, name: "pos2" },
        ]}
        onAddPosition={vi.fn()}
        onRemovePosition={vi.fn()}
        onClearPositions={vi.fn()}
      />,
    );
    expect(screen.getByText("2 positions")).toBeTruthy();
  });

  it("shows singular position count", () => {
    render(
      <RequestEditor
        value="test"
        onChange={vi.fn()}
        positions={[{ id: "1", start: 0, end: 4, name: "pos1" }]}
        onAddPosition={vi.fn()}
        onRemovePosition={vi.fn()}
        onClearPositions={vi.fn()}
      />,
    );
    expect(screen.getByText("1 position")).toBeTruthy();
  });

  it("renders position badges", () => {
    render(
      <RequestEditor
        value="test"
        onChange={vi.fn()}
        positions={[
          { id: "1", start: 0, end: 4, name: "mypos" },
        ]}
        onAddPosition={vi.fn()}
        onRemovePosition={vi.fn()}
        onClearPositions={vi.fn()}
      />,
    );
    expect(screen.getByText("mypos")).toBeTruthy();
  });

  it("calls onRemovePosition when x clicked", () => {
    const onRemove = vi.fn();
    render(
      <RequestEditor
        value="test"
        onChange={vi.fn()}
        positions={[{ id: "abc", start: 0, end: 4, name: "pos1" }]}
        onAddPosition={vi.fn()}
        onRemovePosition={onRemove}
        onClearPositions={vi.fn()}
      />,
    );
    const removeBtn = screen.getAllByText("x")[0];
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith("abc");
  });

  it("calls onClearPositions when Clear All clicked", () => {
    const onClear = vi.fn();
    render(
      <RequestEditor
        value="test"
        onChange={vi.fn()}
        positions={[]}
        onAddPosition={vi.fn()}
        onRemovePosition={vi.fn()}
        onClearPositions={onClear}
      />,
    );
    fireEvent.click(screen.getByText("Clear All"));
    expect(onClear).toHaveBeenCalled();
  });

  it("has Add Position button", () => {
    render(
      <RequestEditor
        value="test"
        onChange={vi.fn()}
        positions={[]}
        onAddPosition={vi.fn()}
        onRemovePosition={vi.fn()}
        onClearPositions={vi.fn()}
      />,
    );
    expect(screen.getByText("Add Position")).toBeTruthy();
  });
});
