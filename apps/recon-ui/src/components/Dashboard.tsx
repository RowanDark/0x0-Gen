import React from "react";
import { useReconProject } from "../hooks/useReconProject.js";
import { useStats } from "../hooks/useStats.js";
import { useTimeline } from "../hooks/useTimeline.js";
import { useImport } from "../hooks/useImport.js";
import { StatCard } from "./StatCard.js";
import { CategoryBreakdown } from "./CategoryBreakdown.js";
import { Timeline } from "./Timeline.js";
import { RecentImports } from "./RecentImports.js";
import { ProjectSelector } from "./ProjectSelector.js";

const categoryOrder = [
  "infrastructure",
  "web_assets",
  "technology",
  "network",
  "people",
  "organizations",
  "credentials",
  "vulnerabilities",
  "files",
];

export interface DashboardProps {
  onNavigate: (view: string, filter?: string) => void;
  onOpenImport: () => void;
}

export function Dashboard({ onNavigate, onOpenImport }: DashboardProps) {
  const { projects, activeProject, selectProject, createProject } = useReconProject();
  const { stats, loading: statsLoading } = useStats();
  const { timeline, range, setRange } = useTimeline();
  const { imports, loadImports } = useImport();

  const sectionStyle: React.CSSProperties = {
    background: "#0f0f0f",
    border: "1px solid #222",
    borderRadius: 6,
    padding: 16,
  };

  const headingStyle: React.CSSProperties = {
    fontSize: 13,
    fontFamily: "monospace",
    color: "#ccc",
    marginBottom: 12,
    fontWeight: 600,
  };

  const quickBtnStyle: React.CSSProperties = {
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: 4,
    color: "#ccc",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: 12,
    padding: "8px 16px",
    flex: 1,
    textAlign: "center",
  };

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      {/* Project selector */}
      <div style={{ marginBottom: 20 }}>
        <ProjectSelector
          projects={projects}
          activeProject={activeProject}
          onSelect={selectProject}
          onCreate={(name) => createProject(name)}
        />
      </div>

      {!activeProject ? (
        <div style={{ padding: 40, textAlign: "center", color: "#555", fontFamily: "monospace" }}>
          Create or select a project to get started
        </div>
      ) : (
        <>
          {/* Total stat */}
          <div style={{ marginBottom: 16 }}>
            <StatCard label="Total Entities" count={stats.total} onClick={() => onNavigate("entities")} />
          </div>

          {/* Category stat cards grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 20 }}>
            {categoryOrder.map((cat) => (
              <StatCard
                key={cat}
                label={cat}
                count={stats.byCategory[cat] ?? 0}
                category={cat}
                onClick={() => onNavigate("entities", cat)}
              />
            ))}
          </div>

          {/* Two column layout: breakdown + timeline */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 20 }}>
            <div style={sectionStyle}>
              <div style={headingStyle}>Category Breakdown</div>
              <CategoryBreakdown data={stats.byCategory} total={stats.total} />
            </div>
            <div style={sectionStyle}>
              <Timeline data={timeline} range={range} onRangeChange={setRange} />
            </div>
          </div>

          {/* Recent imports */}
          <div style={{ ...sectionStyle, marginBottom: 20 }}>
            <div style={headingStyle}>Recent Imports</div>
            <RecentImports imports={imports} onLoadImports={loadImports} />
          </div>

          {/* Quick actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button style={quickBtnStyle} onClick={onOpenImport}>
              Import Data
            </button>
            <button style={quickBtnStyle} onClick={() => onNavigate("entities")}>
              Browse All Entities
            </button>
            <button style={quickBtnStyle} onClick={() => onNavigate("graph")}>
              View Graph
            </button>
          </div>
        </>
      )}
    </div>
  );
}
