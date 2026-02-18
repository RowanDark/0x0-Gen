import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TransformPicker } from "./TransformPicker.js";
import type { TransformTypeInfo } from "../hooks/useTransformTypes.js";

const mockTypes: TransformTypeInfo[] = [
  { type: "base64", name: "Base64", category: "Encoding", directions: ["encode", "decode"], description: "Base64" },
  { type: "url", name: "URL", category: "Encoding", directions: ["encode", "decode"], description: "URL encoding" },
  { type: "md5", name: "MD5", category: "Hash", directions: ["encode"], description: "MD5 hash" },
  { type: "jwt", name: "JWT", category: "Formats", directions: ["decode"], description: "JWT decode" },
];

describe("TransformPicker", () => {
  it("renders category headers", () => {
    render(<TransformPicker types={mockTypes} onAdd={vi.fn()} />);
    expect(screen.getByText("Encoding")).toBeTruthy();
    expect(screen.getByText("Hash")).toBeTruthy();
    expect(screen.getByText("Formats")).toBeTruthy();
  });

  it("renders transform buttons", () => {
    render(<TransformPicker types={mockTypes} onAdd={vi.fn()} />);
    expect(screen.getByText("Base64")).toBeTruthy();
    expect(screen.getByText("URL")).toBeTruthy();
    expect(screen.getByText("MD5")).toBeTruthy();
    expect(screen.getByText("JWT")).toBeTruthy();
  });

  it("calls onAdd with encode on click", () => {
    const onAdd = vi.fn();
    render(<TransformPicker types={mockTypes} onAdd={onAdd} />);
    fireEvent.click(screen.getByText("Base64"));
    expect(onAdd).toHaveBeenCalledWith("base64", "encode");
  });

  it("calls onAdd with decode on right-click", () => {
    const onAdd = vi.fn();
    render(<TransformPicker types={mockTypes} onAdd={onAdd} />);
    fireEvent.contextMenu(screen.getByText("URL"));
    expect(onAdd).toHaveBeenCalledWith("url", "decode");
  });

  it("does not decode on right-click for one-way transforms", () => {
    const onAdd = vi.fn();
    render(<TransformPicker types={mockTypes} onAdd={onAdd} />);
    // MD5 is one-way (encode only), right-click should not call decode
    fireEvent.contextMenu(screen.getByText("MD5"));
    expect(onAdd).not.toHaveBeenCalledWith("md5", "decode");
  });
});
