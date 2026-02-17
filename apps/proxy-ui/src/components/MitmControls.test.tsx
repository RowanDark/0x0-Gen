import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MitmControls } from "./MitmControls.js";

const mockGateway = {
  getCAStatus: vi.fn().mockResolvedValue({ generated: false, fingerprint: "" }),
  getCACertificate: vi.fn().mockResolvedValue("-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----\n"),
  regenerateCA: vi.fn().mockResolvedValue({ generated: true, fingerprint: "aa:bb:cc" }),
};

describe("MitmControls", () => {
  const defaultProps = {
    mitmEnabled: false,
    mitmHosts: "",
    running: false,
    onMitmEnabledChange: vi.fn(),
    onMitmHostsChange: vi.fn(),
    gateway: mockGateway,
  };

  it("renders MITM checkbox", () => {
    render(<MitmControls {...defaultProps} />);
    expect(screen.getByText("MITM")).toBeDefined();
  });

  it("calls onMitmEnabledChange when checkbox is toggled", () => {
    render(<MitmControls {...defaultProps} />);
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(defaultProps.onMitmEnabledChange).toHaveBeenCalledWith(true);
  });

  it("shows host input when MITM is enabled", () => {
    render(<MitmControls {...defaultProps} mitmEnabled={true} />);
    expect(screen.getByPlaceholderText(/All hosts/)).toBeDefined();
  });

  it("hides host input when MITM is disabled", () => {
    render(<MitmControls {...defaultProps} mitmEnabled={false} />);
    expect(screen.queryByPlaceholderText(/All hosts/)).toBeNull();
  });

  it("shows download CA button when MITM is enabled", () => {
    render(<MitmControls {...defaultProps} mitmEnabled={true} />);
    expect(screen.getByText("Download CA")).toBeDefined();
  });

  it("shows regenerate button when MITM is enabled", () => {
    render(<MitmControls {...defaultProps} mitmEnabled={true} />);
    expect(screen.getByText("Regenerate")).toBeDefined();
  });

  it("disables checkbox when running", () => {
    render(<MitmControls {...defaultProps} running={true} />);
    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.disabled).toBe(true);
  });

  it("disables hosts input when running", () => {
    render(<MitmControls {...defaultProps} mitmEnabled={true} running={true} />);
    const input = screen.getByPlaceholderText(/All hosts/) as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });
});
