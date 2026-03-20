import { useState } from 'react';
import { useLocation } from 'wouter';
import { Shell } from '@/components/layout/Shell.tsx';
import { useProjects } from '@/hooks/useProjects.ts';
import { Plus, FolderOpen, Trash2 } from 'lucide-react';

export function Dashboard() {
  const [, setLocation] = useLocation();
  const { projects, createProject, deleteProject } = useProjects();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [projectNumber, setProjectNumber] = useState('');
  const [engineer, setEngineer] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    const project = createProject({
      name: name.trim(),
      client: client.trim(),
      projectNumber: projectNumber.trim(),
      engineer: engineer.trim(),
    });
    setShowCreate(false);
    setName('');
    setClient('');
    setProjectNumber('');
    setEngineer('');
    setLocation(`/project/${project.id}`);
  };

  return (
    <Shell
      title="Seismic Anchorage Calculator"
      subtitle="ASCE 7-22 + ACI 318-19"
      actions={
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      }
    >
      {/* Create Project Dialog */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">New Project</h2>
            <div className="space-y-3">
              <input
                autoFocus
                placeholder="Project Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <input
                placeholder="Client"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                placeholder="Project Number"
                value={projectNumber}
                onChange={(e) => setProjectNumber(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                placeholder="Engineer"
                value={engineer}
                onChange={(e) => setEngineer(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm rounded-lg hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project List */}
      {projects.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-medium mb-2">No projects yet</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Create your first project to start calculating seismic anchorage.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {projects.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors cursor-pointer group"
              onClick={() => setLocation(`/project/${p.id}`)}
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{p.name}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {[p.client, p.projectNumber, p.engineer]
                    .filter(Boolean)
                    .join(' | ') || 'No details'}
                </p>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {new Date(p.updatedAt).toLocaleDateString()}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete project "${p.name}"?`)) deleteProject(p.id);
                }}
                className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
