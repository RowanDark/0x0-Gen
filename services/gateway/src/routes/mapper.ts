import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { createLogger } from "@0x0-gen/logger";
import type { MapperNodeStyle, MapperEdgeStyle, MapperViewport, EntityType } from "@0x0-gen/contracts";
import * as mapperDb from "../db/mapper.js";
import * as reconDb from "../db/recon.js";
import { listTransforms, getTransform } from "../transforms/index.js";
import { broadcast } from "../broadcaster.js";

const logger = createLogger("gateway:mapper");

export async function mapperRoutes(app: FastifyInstance) {
  // Initialize mapper DB schema
  mapperDb.initMapperSchema();

  // ========================
  // Canvas management
  // ========================

  // POST /mapper/canvases — Create canvas
  app.post<{
    Body: { projectId: string; name: string };
  }>("/mapper/canvases", async (request, reply) => {
    const body = request.body as { projectId?: string; name?: string };
    if (!body.projectId || !body.name) {
      return reply.status(400).send({ error: "projectId and name are required" });
    }

    const canvas = mapperDb.createCanvas({
      id: randomUUID(),
      projectId: body.projectId,
      name: body.name,
      now: Date.now(),
    });

    logger.info(`Created mapper canvas ${canvas.id}`);
    broadcast({ type: "mapper:canvas:created", source: "mapper", payload: canvas });
    return reply.status(201).send(canvas);
  });

  // GET /mapper/canvases — List canvases for project
  app.get<{
    Querystring: { projectId?: string };
  }>("/mapper/canvases", async (request, reply) => {
    const projectId = (request.query as { projectId?: string }).projectId;
    if (!projectId) {
      return reply.status(400).send({ error: "projectId query param is required" });
    }
    const canvases = mapperDb.listCanvases(projectId);
    return { canvases };
  });

  // GET /mapper/canvases/:id — Get canvas with nodes/edges
  app.get<{ Params: { id: string } }>(
    "/mapper/canvases/:id",
    async (request, reply) => {
      const canvas = mapperDb.getCanvas(request.params.id);
      if (!canvas) {
        return reply.status(404).send({ error: "Canvas not found" });
      }
      return canvas;
    },
  );

  // PUT /mapper/canvases/:id — Update canvas (viewport, name)
  app.put<{
    Params: { id: string };
    Body: { name?: string; viewport?: MapperViewport };
  }>("/mapper/canvases/:id", async (request, reply) => {
    const body = request.body as { name?: string; viewport?: MapperViewport };
    const canvas = mapperDb.updateCanvas(request.params.id, {
      name: body.name,
      viewport: body.viewport,
      now: Date.now(),
    });
    if (!canvas) {
      return reply.status(404).send({ error: "Canvas not found" });
    }
    return canvas;
  });

  // DELETE /mapper/canvases/:id — Delete canvas
  app.delete<{ Params: { id: string } }>(
    "/mapper/canvases/:id",
    async (request, reply) => {
      const deleted = mapperDb.deleteCanvas(request.params.id);
      if (!deleted) {
        return reply.status(404).send({ error: "Canvas not found" });
      }
      broadcast({ type: "mapper:canvas:deleted", source: "mapper", payload: { id: request.params.id } });
      return { ok: true };
    },
  );

  // ========================
  // Node operations
  // ========================

  // POST /mapper/canvases/:id/nodes — Add node(s)
  app.post<{
    Params: { id: string };
    Body: { nodes: Array<{ entityId?: string; type: string; label: string; x?: number; y?: number; pinned?: boolean; style?: MapperNodeStyle; data?: Record<string, unknown> }> };
  }>("/mapper/canvases/:id/nodes", async (request, reply) => {
    const canvas = mapperDb.getCanvas(request.params.id);
    if (!canvas) {
      return reply.status(404).send({ error: "Canvas not found" });
    }

    const body = request.body as { nodes?: Array<{ entityId?: string; type: string; label: string; x?: number; y?: number; pinned?: boolean; style?: MapperNodeStyle; data?: Record<string, unknown> }> };
    const inputNodes = body.nodes ?? [];
    if (inputNodes.length === 0) {
      return reply.status(400).send({ error: "nodes array is required" });
    }

    const existingNodes = mapperDb.getCanvasNodes(request.params.id);
    const nodesToAdd = inputNodes.map((n, i) => ({
      id: randomUUID(),
      entityId: n.entityId ?? null,
      type: n.type,
      label: n.label,
      x: n.x ?? (100 + i * 150),
      y: n.y ?? (100 + (i % 5) * 100),
      pinned: n.pinned ?? false,
      style: n.style,
      data: n.data,
    }));

    const nodes = mapperDb.addNodesBulk(request.params.id, nodesToAdd);
    return reply.status(201).send({ nodes });
  });

  // POST /mapper/canvases/:id/nodes/from-entities — Add nodes from entity IDs
  app.post<{
    Params: { id: string };
    Body: { entityIds: string[] };
  }>("/mapper/canvases/:id/nodes/from-entities", async (request, reply) => {
    const canvas = mapperDb.getCanvas(request.params.id);
    if (!canvas) {
      return reply.status(404).send({ error: "Canvas not found" });
    }

    const body = request.body as { entityIds?: string[] };
    const entityIds = body.entityIds ?? [];
    if (entityIds.length === 0) {
      return reply.status(400).send({ error: "entityIds array is required" });
    }

    const existingNodes = mapperDb.getCanvasNodes(request.params.id);
    const existingEntityIds = new Set(existingNodes.filter((n) => n.entityId).map((n) => n.entityId));

    const nodesToAdd: Array<{
      id: string;
      entityId: string | null;
      type: string;
      label: string;
      x: number;
      y: number;
      pinned: boolean;
    }> = [];

    for (const entityId of entityIds) {
      if (existingEntityIds.has(entityId)) continue;

      const entity = reconDb.getEntity(entityId);
      if (!entity) continue;

      nodesToAdd.push({
        id: randomUUID(),
        entityId: entity.id,
        type: entity.type,
        label: entity.value,
        x: 200 + Math.random() * 600,
        y: 200 + Math.random() * 400,
        pinned: false,
      });
    }

    if (nodesToAdd.length === 0) {
      return { nodes: [], edges: [] };
    }

    const nodes = mapperDb.addNodesBulk(request.params.id, nodesToAdd);

    // Auto-create edges from existing relationships
    const addedEdges = autoCreateEdges(request.params.id, canvas.projectId);

    return reply.status(201).send({ nodes, edges: addedEdges });
  });

  // PUT /mapper/canvases/:id/nodes/:nid — Update node (position, style)
  app.put<{
    Params: { id: string; nid: string };
    Body: { x?: number; y?: number; pinned?: boolean; label?: string; style?: MapperNodeStyle };
  }>("/mapper/canvases/:id/nodes/:nid", async (request, reply) => {
    const body = request.body as { x?: number; y?: number; pinned?: boolean; label?: string; style?: MapperNodeStyle };
    const node = mapperDb.updateNode(request.params.nid, request.params.id, body);
    if (!node) {
      return reply.status(404).send({ error: "Node not found" });
    }
    return node;
  });

  // DELETE /mapper/canvases/:id/nodes/:nid — Remove node
  app.delete<{ Params: { id: string; nid: string } }>(
    "/mapper/canvases/:id/nodes/:nid",
    async (request, reply) => {
      const deleted = mapperDb.deleteNode(request.params.nid, request.params.id);
      if (!deleted) {
        return reply.status(404).send({ error: "Node not found" });
      }
      return { ok: true };
    },
  );

  // ========================
  // Edge operations
  // ========================

  // POST /mapper/canvases/:id/edges — Add edge
  app.post<{
    Params: { id: string };
    Body: { fromNodeId: string; toNodeId: string; type: string; label?: string; style?: MapperEdgeStyle };
  }>("/mapper/canvases/:id/edges", async (request, reply) => {
    const canvas = mapperDb.getCanvas(request.params.id);
    if (!canvas) {
      return reply.status(404).send({ error: "Canvas not found" });
    }

    const body = request.body as { fromNodeId?: string; toNodeId?: string; type?: string; label?: string; style?: MapperEdgeStyle };
    if (!body.fromNodeId || !body.toNodeId || !body.type) {
      return reply.status(400).send({ error: "fromNodeId, toNodeId, and type are required" });
    }

    const edge = mapperDb.addEdge(request.params.id, {
      id: randomUUID(),
      fromNodeId: body.fromNodeId,
      toNodeId: body.toNodeId,
      type: body.type,
      label: body.label,
      style: body.style,
    });

    return reply.status(201).send(edge);
  });

  // DELETE /mapper/canvases/:id/edges/:eid — Remove edge
  app.delete<{ Params: { id: string; eid: string } }>(
    "/mapper/canvases/:id/edges/:eid",
    async (request, reply) => {
      const deleted = mapperDb.deleteEdge(request.params.eid, request.params.id);
      if (!deleted) {
        return reply.status(404).send({ error: "Edge not found" });
      }
      return { ok: true };
    },
  );

  // ========================
  // Transforms
  // ========================

  // GET /mapper/transforms — List available transforms
  app.get("/mapper/transforms", async () => {
    const transforms = listTransforms();
    return { transforms };
  });

  // POST /mapper/canvases/:id/nodes/:nid/transform — Run transform on node
  app.post<{
    Params: { id: string; nid: string };
    Body: { transformId: string };
  }>("/mapper/canvases/:id/nodes/:nid/transform", async (request, reply) => {
    const canvasId = request.params.id;
    const nodeId = request.params.nid;
    const body = request.body as { transformId?: string };

    if (!body.transformId) {
      return reply.status(400).send({ error: "transformId is required" });
    }

    const canvas = mapperDb.getCanvas(canvasId);
    if (!canvas) {
      return reply.status(404).send({ error: "Canvas not found" });
    }

    const node = mapperDb.getNode(nodeId);
    if (!node) {
      return reply.status(404).send({ error: "Node not found" });
    }

    const transform = getTransform(body.transformId);
    if (!transform) {
      return reply.status(404).send({ error: "Transform not found" });
    }

    if (!transform.inputTypes.includes(node.type)) {
      return reply.status(400).send({ error: `Transform does not support entity type: ${node.type}` });
    }

    // Get entity data if linked
    let entity = node.entityId ? reconDb.getEntity(node.entityId) : null;

    try {
      const result = await transform.execute(
        entity ?? { id: node.id, type: node.type, value: node.label, projectId: canvas.projectId },
        canvas.projectId,
      );

      // Add result nodes and edges to canvas
      const existingNodes = mapperDb.getCanvasNodes(canvasId);
      const existingEntityIds = new Set(existingNodes.filter((n) => n.entityId).map((n) => n.entityId));

      const newNodes: Array<{
        id: string;
        entityId: string | null;
        type: string;
        label: string;
        x: number;
        y: number;
        pinned: boolean;
      }> = [];

      for (const resultNode of result.nodes) {
        if (resultNode.entityId && existingEntityIds.has(resultNode.entityId)) continue;

        newNodes.push({
          id: randomUUID(),
          entityId: resultNode.entityId,
          type: resultNode.type,
          label: resultNode.label,
          x: node.x + (Math.random() - 0.5) * 300,
          y: node.y + (Math.random() - 0.5) * 300,
          pinned: false,
        });
      }

      const addedNodes = newNodes.length > 0 ? mapperDb.addNodesBulk(canvasId, newNodes) : [];

      // Create edges from transform results
      const nodeMap = new Map<string, string>(); // entityId -> nodeId mapping
      for (const n of [...existingNodes, ...addedNodes]) {
        if (n.entityId) nodeMap.set(n.entityId, n.id);
      }

      const newEdges: Array<{
        id: string;
        fromNodeId: string;
        toNodeId: string;
        type: string;
        label?: string;
      }> = [];

      for (const resultEdge of result.edges) {
        const fromId = nodeMap.get(resultEdge.fromNodeId) ?? resultEdge.fromNodeId;
        const toId = nodeMap.get(resultEdge.toNodeId) ?? resultEdge.toNodeId;

        // Verify both nodes exist
        const fromNode = mapperDb.getNode(fromId);
        const toNode = mapperDb.getNode(toId);
        if (!fromNode || !toNode) continue;

        newEdges.push({
          id: randomUUID(),
          fromNodeId: fromId,
          toNodeId: toId,
          type: resultEdge.type,
          label: resultEdge.label,
        });
      }

      const addedEdges = newEdges.length > 0 ? mapperDb.addEdgesBulk(canvasId, newEdges) : [];

      broadcast({
        type: "mapper:transform:completed",
        source: "mapper",
        payload: { canvasId, nodeId, transformId: body.transformId, newNodes: addedNodes.length, newEdges: addedEdges.length },
      });

      return { nodes: addedNodes, edges: addedEdges };
    } catch (err) {
      logger.error(`Transform ${body.transformId} failed`, err);
      return reply.status(500).send({ error: "Transform execution failed" });
    }
  });

  // ========================
  // Layout
  // ========================

  // POST /mapper/canvases/:id/layout — Auto-layout nodes
  app.post<{ Params: { id: string } }>(
    "/mapper/canvases/:id/layout",
    async (request, reply) => {
      const canvas = mapperDb.getCanvas(request.params.id);
      if (!canvas) {
        return reply.status(404).send({ error: "Canvas not found" });
      }

      const nodes = canvas.nodes.filter((n) => !n.pinned);
      const edges = canvas.edges;

      if (nodes.length === 0) return canvas;

      // Simple force-directed layout
      const positions = forceDirectedLayout(canvas.nodes, edges, 100);

      // Update non-pinned node positions
      for (const [nodeId, pos] of Object.entries(positions)) {
        const node = canvas.nodes.find((n) => n.id === nodeId);
        if (node && !node.pinned) {
          mapperDb.updateNode(nodeId, request.params.id, { x: pos.x, y: pos.y });
        }
      }

      return mapperDb.getCanvas(request.params.id);
    },
  );
}

// --- Helper functions ---

function autoCreateEdges(canvasId: string, projectId: string) {
  const nodes = mapperDb.getCanvasNodes(canvasId);
  const existingEdges = mapperDb.getCanvasEdges(canvasId);

  const entityNodeMap = new Map<string, string>();
  for (const n of nodes) {
    if (n.entityId) entityNodeMap.set(n.entityId, n.id);
  }

  const relationships = reconDb.listRelationships(projectId);
  const existingEdgeKeys = new Set(existingEdges.map((e) => `${e.fromNodeId}-${e.toNodeId}`));

  const newEdges: Array<{
    id: string;
    relationshipId: string;
    fromNodeId: string;
    toNodeId: string;
    type: string;
  }> = [];

  for (const rel of relationships) {
    const fromNodeId = entityNodeMap.get(rel.fromEntityId);
    const toNodeId = entityNodeMap.get(rel.toEntityId);
    if (!fromNodeId || !toNodeId) continue;

    const key = `${fromNodeId}-${toNodeId}`;
    if (existingEdgeKeys.has(key)) continue;

    newEdges.push({
      id: randomUUID(),
      relationshipId: rel.id,
      fromNodeId,
      toNodeId,
      type: rel.type,
    });
    existingEdgeKeys.add(key);
  }

  if (newEdges.length > 0) {
    return mapperDb.addEdgesBulk(canvasId, newEdges);
  }
  return [];
}

function forceDirectedLayout(
  nodes: Array<{ id: string; x: number; y: number; pinned: boolean }>,
  edges: Array<{ fromNodeId: string; toNodeId: string }>,
  iterations: number,
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of nodes) {
    positions[node.id] = { x: node.x, y: node.y };
  }

  const repulsion = 5000;
  const attraction = 0.01;
  const damping = 0.9;
  const velocities: Record<string, { vx: number; vy: number }> = {};
  for (const node of nodes) {
    velocities[node.id] = { vx: 0, vy: 0 };
  }

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = positions[a.id].x - positions[b.id].x;
        const dy = positions[a.id].y - positions[b.id].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (!a.pinned) {
          velocities[a.id].vx += fx;
          velocities[a.id].vy += fy;
        }
        if (!b.pinned) {
          velocities[b.id].vx -= fx;
          velocities[b.id].vy -= fy;
        }
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const posA = positions[edge.fromNodeId];
      const posB = positions[edge.toNodeId];
      if (!posA || !posB) continue;

      const dx = posB.x - posA.x;
      const dy = posB.y - posA.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = dist * attraction;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      const nodeA = nodes.find((n) => n.id === edge.fromNodeId);
      const nodeB = nodes.find((n) => n.id === edge.toNodeId);

      if (nodeA && !nodeA.pinned) {
        velocities[edge.fromNodeId].vx += fx;
        velocities[edge.fromNodeId].vy += fy;
      }
      if (nodeB && !nodeB.pinned) {
        velocities[edge.toNodeId].vx -= fx;
        velocities[edge.toNodeId].vy -= fy;
      }
    }

    // Apply velocities and damping
    for (const node of nodes) {
      if (node.pinned) continue;
      velocities[node.id].vx *= damping;
      velocities[node.id].vy *= damping;
      positions[node.id].x += velocities[node.id].vx;
      positions[node.id].y += velocities[node.id].vy;
    }
  }

  return positions;
}
