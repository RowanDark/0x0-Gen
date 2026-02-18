import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "./ProgressBar.js";

describe("ProgressBar", () => {
  it("shows completed/total count", () => {
    render(<ProgressBar completed={50} total={100} startedAt={null} />);
    expect(screen.getByText(/50 \/ 100/)).toBeTruthy();
  });

  it("shows percentage", () => {
    render(<ProgressBar completed={25} total={100} startedAt={null} />);
    expect(screen.getByText(/25%/)).toBeTruthy();
  });

  it("shows 0% when total is 0", () => {
    render(<ProgressBar completed={0} total={0} startedAt={null} />);
    expect(screen.getByText(/0%/)).toBeTruthy();
  });

  it("shows 100% when complete", () => {
    render(<ProgressBar completed={100} total={100} startedAt={null} />);
    expect(screen.getByText(/100%/)).toBeTruthy();
  });

  it("shows req/s when started", () => {
    const startedAt = Date.now() - 10000; // 10 seconds ago
    render(<ProgressBar completed={50} total={100} startedAt={startedAt} />);
    expect(screen.getByText(/req\/s/)).toBeTruthy();
  });

  it("shows ETA when not complete", () => {
    const startedAt = Date.now() - 10000;
    render(<ProgressBar completed={50} total={100} startedAt={startedAt} />);
    expect(screen.getByText(/ETA:/)).toBeTruthy();
  });
});
