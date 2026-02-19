import { useState, useEffect, useCallback, createContext, useContext } from "react";
import type { ReconProject } from "@0x0-gen/sdk";
import { GatewayClient } from "@0x0-gen/sdk";

const gateway = new GatewayClient({ baseUrl: window.location.origin });

export interface ReconProjectState {
  projects: ReconProject[];
  activeProject: ReconProject | null;
  loading: boolean;
  error: string | null;
}

export interface ReconProjectActions {
  loadProjects: () => Promise<void>;
  selectProject: (id: string) => void;
  createProject: (name: string, targets?: string[], description?: string) => Promise<ReconProject>;
  updateProject: (id: string, data: Partial<Pick<ReconProject, "name" | "description" | "targets">>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  gateway: GatewayClient;
}

export type ReconProjectContext = ReconProjectState & ReconProjectActions;

const ProjectContext = createContext<ReconProjectContext | null>(null);

export const ProjectContextProvider = ProjectContext.Provider;

export function useReconProjectProvider(): ReconProjectContext {
  const [projects, setProjects] = useState<ReconProject[]>([]);
  const [activeProject, setActiveProject] = useState<ReconProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await gateway.listReconProjects();
      setProjects(list);
      if (list.length > 0 && !activeProject) {
        setActiveProject(list[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  const selectProject = useCallback(
    (id: string) => {
      const project = projects.find((p) => p.id === id);
      if (project) setActiveProject(project);
    },
    [projects],
  );

  const createProject = useCallback(
    async (name: string, targets?: string[], description?: string) => {
      const project = await gateway.createReconProject({ name, targets, description });
      setProjects((prev) => [...prev, project]);
      setActiveProject(project);
      return project;
    },
    [],
  );

  const updateProject = useCallback(
    async (id: string, data: Partial<Pick<ReconProject, "name" | "description" | "targets">>) => {
      const updated = await gateway.updateReconProject(id, data);
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      if (activeProject?.id === id) setActiveProject(updated);
    },
    [activeProject],
  );

  const deleteProject = useCallback(
    async (id: string) => {
      await gateway.deleteReconProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (activeProject?.id === id) {
        setActiveProject(null);
      }
    },
    [activeProject],
  );

  useEffect(() => {
    loadProjects();
  }, []);

  return {
    projects,
    activeProject,
    loading,
    error,
    loadProjects,
    selectProject,
    createProject,
    updateProject,
    deleteProject,
    gateway,
  };
}

export function useReconProject(): ReconProjectContext {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useReconProject must be used inside ProjectContextProvider");
  return ctx;
}
