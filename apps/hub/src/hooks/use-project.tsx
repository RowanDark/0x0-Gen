import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Project } from "@0x0-gen/sdk";
import { GatewayClient } from "@0x0-gen/sdk";

const gateway = new GatewayClient({ baseUrl: window.location.origin });

interface ProjectContextValue {
  projects: Project[];
  activeProject: Project | null;
  loading: boolean;
  selectProject: (id: string) => void;
  createProject: (name: string) => Promise<Project>;
  updateProject: (id: string, name: string) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

const ACTIVE_PROJECT_KEY = "0x0gen-active-project-id";

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  });
  const [loading, setLoading] = useState(true);

  const refreshProjects = useCallback(async () => {
    try {
      const list = await gateway.listProjects();
      setProjects(list);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const selectProject = useCallback((id: string) => {
    setActiveProjectId(id);
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  }, []);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  // If stored project no longer exists, clear it
  useEffect(() => {
    if (!loading && activeProjectId && !activeProject && projects.length > 0) {
      selectProject(projects[0].id);
    }
  }, [loading, activeProjectId, activeProject, projects, selectProject]);

  const create = useCallback(
    async (name: string): Promise<Project> => {
      const project = await gateway.createProject(name);
      await refreshProjects();
      selectProject(project.id);
      return project;
    },
    [refreshProjects, selectProject],
  );

  const update = useCallback(
    async (id: string, name: string): Promise<Project> => {
      const project = await gateway.updateProject(id, { name });
      await refreshProjects();
      return project;
    },
    [refreshProjects],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await gateway.deleteProject(id);
      if (activeProjectId === id) {
        localStorage.removeItem(ACTIVE_PROJECT_KEY);
        setActiveProjectId(null);
      }
      await refreshProjects();
    },
    [activeProjectId, refreshProjects],
  );

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        loading,
        selectProject,
        createProject: create,
        updateProject: update,
        deleteProject: remove,
        refreshProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return ctx;
}
