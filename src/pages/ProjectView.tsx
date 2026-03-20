import { useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { Shell } from '@/components/layout/Shell.tsx';
import { useCalculations } from '@/hooks/useCalculation.ts';
import { getProjects } from '@/lib/storage.ts';
import { Plus, Calculator, Trash2, FileText } from 'lucide-react';

export function ProjectView() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { calculations, createCalculation, deleteCalculation } = useCalculations(id!);
  const [showCreate, setShowCreate] = useState(false);
  const [calcName, setCalcName] = useState('');
  const [calcDesc, setCalcDesc] = useState('');

  const project = getProjects().find((p) => p.id === id);
  if (!project) {
    return (
      <Shell title="Project Not Found" backHref="/">
        <p className="text-muted-foreground">This project doesn't exist.</p>
      </Shell>
    );
  }

  const handleCreate = () => {
    if (!calcName.trim()) return;
    const calc = createCalculation(calcName.trim(), calcDesc.trim());
    setShowCreate(false);
    setCalcName('');
    setCalcDesc('');
    setLocation(`/project/${id}/calc/${calc.id}`);
  };

  return (
    <Shell
      title={project.name}
      subtitle={[project.client, project.projectNumber].filter(Boolean).join(' | ')}
      backHref="/"
      actions={
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Calculation
        </button>
      }
    >
      {/* Create Calculation Dialog */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">New Calculation</h2>
            <div className="space-y-3">
              <input
                autoFocus
                placeholder="Calculation Name *"
                value={calcName}
                onChange={(e) => setCalcName(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <input
                placeholder="Description (e.g., RTU-1 on Roof)"
                value={calcDesc}
                onChange={(e) => setCalcDesc(e.target.value)}
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
                disabled={!calcName.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calculation List */}
      {calculations.length === 0 ? (
        <div className="text-center py-20">
          <Calculator className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-medium mb-2">No calculations yet</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Add a calculation to design seismic anchorage for equipment.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Calculation
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {calculations.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors cursor-pointer group"
              onClick={() => setLocation(`/project/${id}/calc/${c.id}`)}
            >
              <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{c.name}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {c.description || 'No description'}
                </p>
              </div>
              <StatusBadge status={c.status} result={c.results?.overallStatus} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${c.name}"?`)) deleteCalculation(c.id);
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

function StatusBadge({ status, result }: { status: string; result?: string }) {
  if (status === 'draft') {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-secondary text-muted-foreground font-medium">
        Draft
      </span>
    );
  }
  if (result === 'PASS') {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-pass/20 text-pass font-bold">
        PASS
      </span>
    );
  }
  if (result === 'FAIL') {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-fail/20 text-fail font-bold">
        FAIL
      </span>
    );
  }
  return null;
}
