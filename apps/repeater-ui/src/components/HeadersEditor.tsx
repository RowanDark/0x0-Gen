import React, { useState } from "react";

interface Header {
  id: string;
  name: string;
  value: string;
  enabled: boolean;
}

interface HeadersEditorProps {
  headers: Record<string, string>;
  onChange: (headers: Record<string, string>) => void;
}

const COMMON_HEADERS = [
  "Content-Type",
  "Authorization",
  "Accept",
  "User-Agent",
  "Cookie",
  "X-Requested-With",
  "X-API-Key",
  "X-CSRF-Token",
  "Cache-Control",
  "Referer",
];

function headersToRows(headers: Record<string, string>): Header[] {
  return Object.entries(headers).map(([name, value], i) => ({
    id: String(i),
    name,
    value,
    enabled: true,
  }));
}

function rowsToHeaders(rows: Header[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const row of rows) {
    if (row.enabled && row.name.trim()) {
      result[row.name.trim()] = row.value;
    }
  }
  return result;
}

export function HeadersEditor({ headers, onChange }: HeadersEditorProps) {
  const [rows, setRows] = useState<Header[]>(() => headersToRows(headers));

  const update = (updated: Header[]) => {
    setRows(updated);
    onChange(rowsToHeaders(updated));
  };

  const addRow = () => {
    const newRow: Header = { id: Date.now().toString(), name: "", value: "", enabled: true };
    update([...rows, newRow]);
  };

  const removeRow = (id: string) => {
    update(rows.filter((r) => r.id !== id));
  };

  const toggleRow = (id: string) => {
    update(rows.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const setName = (id: string, name: string) => {
    update(rows.map((r) => (r.id === id ? { ...r, name } : r)));
  };

  const setValue = (id: string, value: string) => {
    update(rows.map((r) => (r.id === id ? { ...r, value } : r)));
  };

  const inputStyle: React.CSSProperties = {
    background: "transparent",
    border: "none",
    borderBottom: "1px solid #333",
    color: "#ccc",
    fontFamily: "monospace",
    fontSize: "12px",
    outline: "none",
    padding: "3px 4px",
    width: "100%",
  };

  return (
    <div style={{ fontSize: "12px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ color: "#666", textAlign: "left" }}>
            <th style={{ width: 24, padding: "2px 4px" }}></th>
            <th style={{ padding: "2px 8px" }}>Name</th>
            <th style={{ padding: "2px 8px" }}>Value</th>
            <th style={{ width: 24 }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} style={{ opacity: row.enabled ? 1 : 0.4 }}>
              <td style={{ padding: "2px 4px" }}>
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={() => toggleRow(row.id)}
                  style={{ cursor: "pointer" }}
                />
              </td>
              <td style={{ padding: "2px 4px", position: "relative" }}>
                <input
                  value={row.name}
                  onChange={(e) => setName(row.id, e.target.value)}
                  placeholder="Header name"
                  style={inputStyle}
                  list={`headers-list-${row.id}`}
                />
                <datalist id={`headers-list-${row.id}`}>
                  {COMMON_HEADERS.map((h) => (
                    <option key={h} value={h} />
                  ))}
                </datalist>
              </td>
              <td style={{ padding: "2px 4px" }}>
                <input
                  value={row.value}
                  onChange={(e) => setValue(row.id, e.target.value)}
                  placeholder="Value"
                  style={inputStyle}
                />
              </td>
              <td style={{ padding: "2px 4px" }}>
                <button
                  onClick={() => removeRow(row.id)}
                  title="Remove header"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#555",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: 0,
                  }}
                  onMouseEnter={(e) =>
                    ((e.target as HTMLButtonElement).style.color = "#cc4444")
                  }
                  onMouseLeave={(e) =>
                    ((e.target as HTMLButtonElement).style.color = "#555")
                  }
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={addRow}
        style={{
          marginTop: 6,
          background: "none",
          border: "1px dashed #444",
          color: "#666",
          cursor: "pointer",
          fontSize: "11px",
          padding: "3px 10px",
          borderRadius: 3,
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.borderColor = "#888";
          (e.target as HTMLButtonElement).style.color = "#aaa";
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.borderColor = "#444";
          (e.target as HTMLButtonElement).style.color = "#666";
        }}
      >
        + Add header
      </button>
    </div>
  );
}
