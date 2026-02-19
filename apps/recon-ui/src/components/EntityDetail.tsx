import React, { useState, useCallback } from "react";
import type { ReconEntity, ReconRelationship } from "@0x0-gen/sdk";
import { TagManager } from "./TagManager.js";

export interface EntityDetailProps {
  entity: ReconEntity & { relationships: ReconRelationship[] };
  loading: boolean;
  onClose: () => void;
  onUpdateTags: (tags: string[]) => void;
  onUpdateNotes: (notes: string) => void;
  onDelete: () => void;
  onNavigateEntity: (id: string) => void;
  onAddToMapper?: (entityId: string) => void;
}

const categoryColors: Record<string, string> = {
  infrastructure: "#3b82f6",
  web_assets: "#8b5cf6",
  technology: "#06b6d4",
  network: "#f59e0b",
  people: "#ec4899",
  organizations: "#14b8a6",
  credentials: "#ef4444",
  vulnerabilities: "#f97316",
  files: "#84cc16",
};

export function EntityDetail({
  entity,
  loading,
  onClose,
  onUpdateTags,
  onUpdateNotes,
  onDelete,
  onNavigateEntity,
  onAddToMapper,
}: EntityDetailProps) {
  const [notes, setNotes] = useState(entity.notes ?? "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const color = categoryColors[entity.category] ?? "#888";

  const handleNotesBlur = useCallback(() => {
    if (notes !== (entity.notes ?? "")) {
      onUpdateNotes(notes);
    }
  }, [notes, entity.notes, onUpdateNotes]);

  const handleSendToRepeater = useCallback(() => {
    if (entity.type !== "url") return;
    const repeaterUrl = `/repeater?url=${encodeURIComponent(entity.value)}`;
    window.open(repeaterUrl, "_blank");
  }, [entity]);

  const handleSendToIntruder = useCallback(() => {
    if (entity.type !== "url") return;
    const intruderUrl = `/intruder?url=${encodeURIComponent(entity.value)}`;
    window.open(intruderUrl, "_blank");
  }, [entity]);

  const handleAddToMapper = useCallback(() => {
    onAddToMapper?.(entity.id);
  }, [entity, onAddToMapper]);

  const sectionStyle: React.CSSProperties = {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: "1px solid #1a1a1a",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    color: "#666",
    fontFamily: "monospace",
    marginBottom: 4,
    textTransform: "uppercase",
  };

  const valueStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#ccc",
    fontFamily: "monospace",
    wordBreak: "break-all",
  };

  const btnStyle: React.CSSProperties = {
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: 3,
    color: "#888",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: 10,
    padding: "4px 10px",
  };

  return (
    <div
      style={{
        width: 340,
        borderLeft: "1px solid #222",
        overflow: "auto",
        padding: 16,
        background: "#0a0a0a",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <span
            style={{
              color,
              background: `${color}15`,
              padding: "2px 8px",
              borderRadius: 3,
              fontSize: 10,
              fontFamily: "monospace",
              textTransform: "capitalize",
            }}
          >
            {entity.type}
          </span>
        </div>
        <button onClick={onClose} style={{ ...btnStyle, padding: "2px 8px" }}>
          &times;
        </button>
      </div>

      {/* Value */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Value</div>
        <div style={{ ...valueStyle, fontSize: 14, color: "#eee" }}>{entity.value}</div>
      </div>

      {/* Basic Info */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Info</div>
        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "4px 8px" }}>
          <span style={{ fontSize: 10, color: "#666", fontFamily: "monospace" }}>Category</span>
          <span style={{ ...valueStyle, textTransform: "capitalize" }}>{entity.category.replace(/_/g, " ")}</span>
          <span style={{ fontSize: 10, color: "#666", fontFamily: "monospace" }}>Type</span>
          <span style={valueStyle}>{entity.type}</span>
          <span style={{ fontSize: 10, color: "#666", fontFamily: "monospace" }}>Confidence</span>
          <span style={valueStyle}>{entity.confidence}%</span>
          <span style={{ fontSize: 10, color: "#666", fontFamily: "monospace" }}>First Seen</span>
          <span style={valueStyle}>{new Date(entity.firstSeen).toLocaleString()}</span>
          <span style={{ fontSize: 10, color: "#666", fontFamily: "monospace" }}>Last Seen</span>
          <span style={valueStyle}>{new Date(entity.lastSeen).toLocaleString()}</span>
        </div>
      </div>

      {/* Attributes */}
      {Object.keys(entity.attributes).length > 0 && (
        <div style={sectionStyle}>
          <div style={labelStyle}>Attributes</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px" }}>
            {Object.entries(entity.attributes).map(([key, val]) => (
              <React.Fragment key={key}>
                <span style={{ fontSize: 10, color: "#666", fontFamily: "monospace" }}>{key}</span>
                <span style={{ fontSize: 11, color: "#ccc", fontFamily: "monospace", wordBreak: "break-all" }}>
                  {typeof val === "object" ? JSON.stringify(val) : String(val)}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Sources</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {entity.sources.map((src: string) => (
            <span
              key={src}
              style={{
                background: "#1a1a1a",
                border: "1px solid #333",
                padding: "2px 8px",
                borderRadius: 3,
                fontSize: 10,
                fontFamily: "monospace",
                color: "#ccc",
              }}
            >
              {src}
            </span>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Tags</div>
        <TagManager
          tags={entity.tags}
          onChange={onUpdateTags}
        />
      </div>

      {/* Notes */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Notes</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Add notes..."
          style={{
            width: "100%",
            minHeight: 80,
            background: "#111",
            border: "1px solid #333",
            borderRadius: 3,
            color: "#ccc",
            fontFamily: "monospace",
            fontSize: 11,
            padding: 8,
            outline: "none",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Relationships */}
      {entity.relationships.length > 0 && (
        <div style={sectionStyle}>
          <div style={labelStyle}>Relationships ({entity.relationships.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {entity.relationships.map((rel: ReconRelationship) => {
              const targetId = rel.fromEntityId === entity.id ? rel.toEntityId : rel.fromEntityId;
              const direction = rel.fromEntityId === entity.id ? "\u2192" : "\u2190";
              return (
                <div
                  key={rel.id}
                  onClick={() => onNavigateEntity(targetId)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 8px",
                    background: "#111",
                    borderRadius: 3,
                    cursor: "pointer",
                    fontSize: 10,
                    fontFamily: "monospace",
                  }}
                >
                  <span style={{ color: "#555" }}>{direction}</span>
                  <span style={{ color: "#22c55e" }}>{rel.type.replace(/_/g, " ")}</span>
                  <span style={{ color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {targetId.slice(0, 8)}...
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tool Integration Actions */}
      <div style={{ ...sectionStyle, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {entity.type === "url" && (
          <>
            <button onClick={handleSendToRepeater} style={btnStyle}>
              Send to Repeater
            </button>
            <button onClick={handleSendToIntruder} style={btnStyle}>
              Send to Intruder
            </button>
          </>
        )}
        <button
          onClick={handleAddToMapper}
          style={{ ...btnStyle, color: "#22c55e", borderColor: "#22c55e44" }}
        >
          Add to Mapper
        </button>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{ ...btnStyle, color: "#ef4444", borderColor: "#ef444444" }}
          >
            Delete
          </button>
        ) : (
          <>
            <button
              onClick={() => { onDelete(); setShowDeleteConfirm(false); }}
              style={{ ...btnStyle, background: "#ef444422", color: "#ef4444", borderColor: "#ef4444" }}
            >
              Confirm Delete
            </button>
            <button onClick={() => setShowDeleteConfirm(false)} style={btnStyle}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
