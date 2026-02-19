import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Legend } from "@0x0-gen/mapper-components";

describe("Mapper Legend", () => {
  it("renders category labels for visible categories", () => {
    const visible = new Set(["infrastructure", "web_assets"]);
    render(<Legend visibleCategories={visible} />);
    expect(screen.getByText("Infrastructure")).toBeTruthy();
    expect(screen.getByText("Web Assets")).toBeTruthy();
    expect(screen.queryByText("Network")).toBeNull();
  });

  it("renders nothing when no categories visible", () => {
    const visible = new Set<string>();
    const { container } = render(<Legend visibleCategories={visible} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders all categories when visibleCategories is undefined", () => {
    render(<Legend />);
    expect(screen.getByText("Infrastructure")).toBeTruthy();
    expect(screen.getByText("Web Assets")).toBeTruthy();
    expect(screen.getByText("Technology")).toBeTruthy();
    expect(screen.getByText("Network")).toBeTruthy();
    expect(screen.getByText("People")).toBeTruthy();
    expect(screen.getByText("Organizations")).toBeTruthy();
    expect(screen.getByText("Credentials")).toBeTruthy();
    expect(screen.getByText("Vulnerabilities")).toBeTruthy();
    expect(screen.getByText("Files")).toBeTruthy();
  });
});
