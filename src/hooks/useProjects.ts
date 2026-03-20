import { useState, useCallback } from 'react';
import type { Project } from '@/lib/types.ts';
import { getProjects, saveProject, deleteProject as removeProject, generateId } from '@/lib/storage.ts';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(() => getProjects());

  const refresh = useCallback(() => {
    setProjects(getProjects());
  }, []);

  const createProject = useCallback(
    (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const project: Project = {
        ...data,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      saveProject(project);
      refresh();
      return project;
    },
    [refresh]
  );

  const updateProject = useCallback(
    (project: Project) => {
      saveProject(project);
      refresh();
    },
    [refresh]
  );

  const removeProjectById = useCallback(
    (id: string) => {
      removeProject(id);
      refresh();
    },
    [refresh]
  );

  return { projects, createProject, updateProject, deleteProject: removeProjectById, refresh };
}
