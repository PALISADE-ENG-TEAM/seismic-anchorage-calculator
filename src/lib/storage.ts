// ============================================================================
// localStorage Persistence Layer
// ============================================================================

import type { Project, Calculation } from './types.ts';

const PROJECTS_KEY = 'seismic_projects';
const CALCULATIONS_KEY = 'seismic_calculations';

// --- Projects ---

export function getProjects(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveProject(project: Project): void {
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = { ...project, updatedAt: new Date().toISOString() };
  } else {
    projects.push(project);
  }
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function deleteProject(id: string): void {
  const projects = getProjects().filter((p) => p.id !== id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  // Also delete all calculations for this project
  const calcs = getCalculations().filter((c) => c.projectId !== id);
  localStorage.setItem(CALCULATIONS_KEY, JSON.stringify(calcs));
}

// --- Migration ---

/**
 * Migrate old calculation data to support new rigid bolt group fields.
 * Fills in defaults for missing optional fields (backwards compatible).
 */
function migrateCalculation(calc: Calculation): Calculation {
  const layout = calc.anchorageConfig?.anchorLayout;
  if (layout && layout.analysisMethod === undefined) {
    layout.analysisMethod = 'simple';
  }
  const equip = calc.equipmentProperties;
  if (equip && equip.cgOffsetX === undefined) {
    equip.cgOffsetX = 0;
    equip.cgOffsetY = 0;
  }
  return calc;
}

// --- Calculations ---

export function getCalculations(projectId?: string): Calculation[] {
  try {
    const raw = localStorage.getItem(CALCULATIONS_KEY);
    const calcs: Calculation[] = raw ? JSON.parse(raw) : [];
    const migrated = calcs.map(migrateCalculation);
    if (projectId) return migrated.filter((c) => c.projectId === projectId);
    return migrated;
  } catch {
    return [];
  }
}

export function getCalculation(id: string): Calculation | undefined {
  return getCalculations().find((c) => c.id === id);
}

export function saveCalculation(calc: Calculation): void {
  const calcs = getCalculations();
  const idx = calcs.findIndex((c) => c.id === calc.id);
  if (idx >= 0) {
    calcs[idx] = calc;
  } else {
    calcs.push(calc);
  }
  localStorage.setItem(CALCULATIONS_KEY, JSON.stringify(calcs));
}

export function deleteCalculation(id: string): void {
  const calcs = getCalculations().filter((c) => c.id !== id);
  localStorage.setItem(CALCULATIONS_KEY, JSON.stringify(calcs));
}

// --- Utility ---

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
