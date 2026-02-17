import React from "react";
import type { CapturedExchange } from "@0x0-gen/sdk";
import { RequestPane } from "./RequestPane.js";
import { ResponsePane } from "./ResponsePane.js";

interface ExchangeDetailProps {
  exchange: CapturedExchange | null;
}

export function ExchangeDetail({ exchange }: ExchangeDetailProps) {
  if (!exchange) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#555",
          fontSize: "13px",
          fontFamily: "monospace",
        }}
      >
        Select an exchange to view details
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, minHeight: 0, borderBottom: "1px solid #333" }}>
        <RequestPane request={exchange.request} />
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {exchange.response ? (
          <ResponsePane response={exchange.response} />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#555",
              fontSize: "13px",
            }}
          >
            Waiting for response...
          </div>
        )}
      </div>
    </div>
  );
}
