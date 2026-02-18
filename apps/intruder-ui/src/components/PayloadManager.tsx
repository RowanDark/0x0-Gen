import React from "react";
import type { IntruderPayloadSet } from "@0x0-gen/sdk";
import { PayloadList } from "./PayloadList.js";

interface PayloadManagerProps {
  payloadSets: IntruderPayloadSet[];
  onUpdate: (sets: IntruderPayloadSet[]) => void;
  attackType: string;
}

export function PayloadManager({ payloadSets, onUpdate, attackType }: PayloadManagerProps) {
  const needsMultiple = attackType === "pitchfork" || attackType === "cluster_bomb";

  const addPayloadSet = () => {
    const newSet: IntruderPayloadSet = {
      id: crypto.randomUUID(),
      name: `Payload Set ${payloadSets.length + 1}`,
      payloads: [],
      source: "manual",
    };
    onUpdate([...payloadSets, newSet]);
  };

  const removePayloadSet = (id: string) => {
    onUpdate(payloadSets.filter((s) => s.id !== id));
  };

  const updatePayloadSet = (id: string, update: Partial<IntruderPayloadSet>) => {
    onUpdate(
      payloadSets.map((s) => (s.id === id ? { ...s, ...update } : s)),
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, height: "100%" }}>
      <div
        style={{
          alignItems: "center",
          borderBottom: "1px solid #333",
          display: "flex",
          gap: 8,
          paddingBottom: 8,
        }}
      >
        <span style={{ color: "#888", fontSize: "11px" }}>Payload Sets</span>
        {needsMultiple && (
          <button
            onClick={addPayloadSet}
            style={{
              background: "#2a2a5a",
              border: "1px solid #3a3a7a",
              borderRadius: 3,
              color: "#aaaaff",
              cursor: "pointer",
              fontSize: "10px",
              padding: "2px 8px",
            }}
          >
            Add Set
          </button>
        )}
        <span style={{ color: "#555", fontSize: "10px", marginLeft: "auto" }}>
          {payloadSets.reduce((sum, s) => sum + s.payloads.length, 0)} total payloads
        </span>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {payloadSets.length === 0 ? (
          <div style={{ color: "#555", fontSize: "11px", padding: 8, textAlign: "center" }}>
            No payload sets.{" "}
            <button
              onClick={addPayloadSet}
              style={{
                background: "none",
                border: "none",
                color: "#88f",
                cursor: "pointer",
                fontSize: "11px",
                textDecoration: "underline",
              }}
            >
              Add one
            </button>
          </div>
        ) : (
          payloadSets.map((set, i) => (
            <div
              key={set.id}
              style={{
                borderBottom: "1px solid #222",
                marginBottom: 8,
                paddingBottom: 8,
              }}
            >
              <PayloadList
                payloadSet={set}
                index={i}
                onUpdate={(update) => updatePayloadSet(set.id, update)}
                onRemove={needsMultiple ? () => removePayloadSet(set.id) : undefined}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
