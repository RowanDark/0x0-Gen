import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuickActions, detectEncoding } from "./QuickActions.js";

describe("QuickActions", () => {
  const defaultProps = {
    input: "test",
    onExecuteQuick: vi.fn(),
    onSmartDecode: vi.fn(),
  };

  it("renders all quick action buttons", () => {
    render(<QuickActions {...defaultProps} />);
    expect(screen.getByText("URL Decode")).toBeTruthy();
    expect(screen.getByText("Base64 Decode")).toBeTruthy();
    expect(screen.getByText("HTML Decode")).toBeTruthy();
    expect(screen.getByText("MD5")).toBeTruthy();
    expect(screen.getByText("Smart Decode")).toBeTruthy();
  });

  it("calls onExecuteQuick with correct args for URL Decode", () => {
    const onExecuteQuick = vi.fn();
    render(<QuickActions {...defaultProps} onExecuteQuick={onExecuteQuick} />);
    fireEvent.click(screen.getByText("URL Decode"));
    expect(onExecuteQuick).toHaveBeenCalledWith("url", "decode");
  });

  it("calls onExecuteQuick with correct args for MD5", () => {
    const onExecuteQuick = vi.fn();
    render(<QuickActions {...defaultProps} onExecuteQuick={onExecuteQuick} />);
    fireEvent.click(screen.getByText("MD5"));
    expect(onExecuteQuick).toHaveBeenCalledWith("md5", "encode");
  });

  it("calls onSmartDecode when Smart Decode clicked", () => {
    const onSmartDecode = vi.fn();
    render(<QuickActions {...defaultProps} onSmartDecode={onSmartDecode} />);
    fireEvent.click(screen.getByText("Smart Decode"));
    expect(onSmartDecode).toHaveBeenCalled();
  });

  it("disables buttons when input is empty", () => {
    const onExecuteQuick = vi.fn();
    render(
      <QuickActions {...defaultProps} input="" onExecuteQuick={onExecuteQuick} />,
    );
    fireEvent.click(screen.getByText("URL Decode"));
    expect(onExecuteQuick).not.toHaveBeenCalled();
  });
});

describe("detectEncoding", () => {
  it("detects JWT tokens", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
    const result = detectEncoding(jwt);
    expect(result).toEqual({ type: "jwt", direction: "decode" });
  });

  it("detects URL encoding", () => {
    const result = detectEncoding("hello%20world");
    expect(result).toEqual({ type: "url", direction: "decode" });
  });

  it("detects base64", () => {
    const result = detectEncoding("SGVsbG8=");
    expect(result).toEqual({ type: "base64", direction: "decode" });
  });

  it("detects HTML entities", () => {
    const result = detectEncoding("&lt;script&gt;");
    expect(result).toEqual({ type: "html", direction: "decode" });
  });

  it("detects unicode escapes", () => {
    const result = detectEncoding("\\u0048\\u0069");
    expect(result).toEqual({ type: "unicode", direction: "decode" });
  });

  it("returns null for plain text", () => {
    const result = detectEncoding("just plain text");
    expect(result).toBeNull();
  });
});
