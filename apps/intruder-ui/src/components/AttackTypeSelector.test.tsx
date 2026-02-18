import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AttackTypeSelector } from "./AttackTypeSelector.js";

describe("AttackTypeSelector", () => {
  it("renders all four attack types", () => {
    render(
      <AttackTypeSelector
        value="sniper"
        onChange={vi.fn()}
        positionCount={1}
        payloadCounts={[10]}
      />,
    );
    expect(screen.getByText("Sniper")).toBeTruthy();
    expect(screen.getByText("Battering Ram")).toBeTruthy();
    expect(screen.getByText("Pitchfork")).toBeTruthy();
    expect(screen.getByText("Cluster Bomb")).toBeTruthy();
  });

  it("shows descriptions for each type", () => {
    render(
      <AttackTypeSelector
        value="sniper"
        onChange={vi.fn()}
        positionCount={1}
        payloadCounts={[10]}
      />,
    );
    expect(screen.getByText("Test each position one at a time")).toBeTruthy();
    expect(screen.getByText("Same payload in all positions")).toBeTruthy();
    expect(screen.getByText("Parallel payload lists")).toBeTruthy();
    expect(screen.getByText("All combinations")).toBeTruthy();
  });

  it("calls onChange when type selected", () => {
    const onChange = vi.fn();
    render(
      <AttackTypeSelector
        value="sniper"
        onChange={onChange}
        positionCount={1}
        payloadCounts={[10]}
      />,
    );
    fireEvent.click(screen.getByText("Battering Ram"));
    expect(onChange).toHaveBeenCalledWith("battering_ram");
  });

  it("shows estimated request count for sniper", () => {
    render(
      <AttackTypeSelector
        value="sniper"
        onChange={vi.fn()}
        positionCount={2}
        payloadCounts={[5]}
      />,
    );
    // 2 positions * 5 payloads = 10
    expect(screen.getByText("~10 requests")).toBeTruthy();
  });

  it("shows estimated request count for cluster_bomb", () => {
    render(
      <AttackTypeSelector
        value="cluster_bomb"
        onChange={vi.fn()}
        positionCount={2}
        payloadCounts={[3, 4]}
      />,
    );
    // 3 * 4 = 12
    expect(screen.getByText("~12 requests")).toBeTruthy();
  });

  it("shows 0 requests when no positions", () => {
    render(
      <AttackTypeSelector
        value="sniper"
        onChange={vi.fn()}
        positionCount={0}
        payloadCounts={[10]}
      />,
    );
    expect(screen.getByText("~0 requests")).toBeTruthy();
  });
});
