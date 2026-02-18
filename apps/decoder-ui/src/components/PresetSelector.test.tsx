import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PresetSelector } from "./PresetSelector.js";
import type { DecoderPreset } from "@0x0-gen/sdk";

const makePreset = (
  name: string,
  isBuiltin: boolean,
): DecoderPreset & { isBuiltin: boolean } => ({
  id: crypto.randomUUID(),
  name,
  steps: [{ type: "base64", direction: "decode" }],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isBuiltin,
});

describe("PresetSelector", () => {
  const presets = [
    makePreset("URL Decode", true),
    makePreset("Base64 Decode", true),
    makePreset("My Custom", false),
  ];

  it("renders the Presets button", () => {
    render(<PresetSelector presets={presets} onLoadPreset={vi.fn()} />);
    expect(screen.getByText(/Presets/)).toBeTruthy();
  });

  it("opens dropdown on click", () => {
    render(<PresetSelector presets={presets} onLoadPreset={vi.fn()} />);
    fireEvent.click(screen.getByText(/Presets/));
    expect(screen.getByText("BUILT-IN")).toBeTruthy();
    expect(screen.getByText("CUSTOM")).toBeTruthy();
  });

  it("shows preset names in dropdown", () => {
    render(<PresetSelector presets={presets} onLoadPreset={vi.fn()} />);
    fireEvent.click(screen.getByText(/Presets/));
    expect(screen.getByText("URL Decode")).toBeTruthy();
    expect(screen.getByText("Base64 Decode")).toBeTruthy();
    expect(screen.getByText("My Custom")).toBeTruthy();
  });

  it("calls onLoadPreset when preset clicked", () => {
    const onLoadPreset = vi.fn();
    render(<PresetSelector presets={presets} onLoadPreset={onLoadPreset} />);
    fireEvent.click(screen.getByText(/Presets/));
    fireEvent.click(screen.getByText("URL Decode"));
    expect(onLoadPreset).toHaveBeenCalledWith(presets[0].steps);
  });

  it("filters presets by search", () => {
    render(<PresetSelector presets={presets} onLoadPreset={vi.fn()} />);
    fireEvent.click(screen.getByText(/Presets/));
    const search = screen.getByPlaceholderText("Filter...");
    fireEvent.change(search, { target: { value: "URL" } });
    expect(screen.getByText("URL Decode")).toBeTruthy();
    expect(screen.queryByText("My Custom")).toBeNull();
  });
});
