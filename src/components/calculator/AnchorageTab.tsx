import type { AnchorageConfig, AnchorType, AnchorMaterial } from '@/lib/types.ts';
import { ANCHOR_STEEL_PROPERTIES, CONCRETE_STRENGTHS } from '@/lib/constants.ts';
import { AnchorDiagram } from '@/components/diagrams/AnchorDiagram.tsx';

const ANCHOR_TYPES: { value: AnchorType; label: string }[] = [
  { value: 'cast-in', label: 'Cast-in-Place' },
  { value: 'post-installed-expansion', label: 'Post-Installed Expansion' },
  { value: 'post-installed-adhesive', label: 'Post-Installed Adhesive' },
];

const ANCHOR_MATERIALS: { value: AnchorMaterial; label: string }[] = [
  { value: 'A307', label: 'A307 (58 ksi)' },
  { value: 'A36', label: 'A36 (58 ksi)' },
  { value: 'F1554-36', label: 'F1554 Gr. 36 (58 ksi)' },
  { value: 'F1554-55', label: 'F1554 Gr. 55 (75 ksi)' },
  { value: 'A193-B7', label: 'A193-B7 (125 ksi)' },
];

const PATTERNS = ['2x2', '2x3', '3x3', '2x4', '3x4', '4x4'];

export function AnchorageTab({
  config,
  onChange,
  onLayoutChange,
  equipLength,
  equipWidth,
}: {
  config: AnchorageConfig;
  onChange: (updates: Partial<AnchorageConfig>) => void;
  onLayoutChange: (updates: Partial<AnchorageConfig['anchorLayout']>) => void;
  equipLength: number;
  equipWidth: number;
}) {
  const handlePatternChange = (pattern: string) => {
    const [nL, nT] = pattern.split('x').map(Number);
    onLayoutChange({ pattern, nLong: nL, nTrans: nT });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Inputs */}
      <div className="space-y-6">
        {/* Anchor Properties */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Anchor Properties
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-muted-foreground">Anchor Type</span>
              <select
                value={config.anchorType}
                onChange={(e) => onChange({ anchorType: e.target.value as AnchorType })}
                className="mt-1 w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {ANCHOR_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Anchor Material</span>
              <select
                value={config.anchorMaterial}
                onChange={(e) => onChange({ anchorMaterial: e.target.value as AnchorMaterial })}
                className="mt-1 w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {ANCHOR_MATERIALS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-muted-foreground">Anchor Diameter (in)</span>
              <select
                value={config.anchorDiameter}
                onChange={(e) => onChange({ anchorDiameter: parseFloat(e.target.value) })}
                className="mt-1 w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {ANCHOR_STEEL_PROPERTIES.map((a) => (
                  <option key={a.diameter} value={a.diameter}>{a.diameterLabel}" ({a.diameter}")</option>
                ))}
              </select>
            </label>
            <NumField
              label="Embedment Depth, hef (in)"
              value={config.embedmentDepth}
              onChange={(v) => onChange({ embedmentDepth: v })}
              step={0.25}
            />
          </div>
          <label className="block">
            <span className="text-xs text-muted-foreground">Concrete Strength, f'c (psi)</span>
            <select
              value={config.concreteStrength}
              onChange={(e) => onChange({ concreteStrength: parseInt(e.target.value) })}
              className="mt-1 w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {CONCRETE_STRENGTHS.map((fc) => (
                <option key={fc} value={fc}>{fc.toLocaleString()} psi</option>
              ))}
            </select>
          </label>
        </fieldset>

        {/* Anchor Layout */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Anchor Layout
          </legend>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs text-muted-foreground">Pattern</span>
              <select
                value={config.anchorLayout.pattern}
                onChange={(e) => handlePatternChange(e.target.value)}
                className="mt-1 w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {PATTERNS.map((p) => (
                  <option key={p} value={p}>{p} ({p.split('x').map(Number).reduce((a, b) => a * b)} anchors)</option>
                ))}
              </select>
            </label>
            <NumField
              label="nLong"
              value={config.anchorLayout.nLong}
              onChange={(v) => onLayoutChange({ nLong: v })}
            />
            <NumField
              label="nTrans"
              value={config.anchorLayout.nTrans}
              onChange={(v) => onLayoutChange({ nTrans: v })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumField
              label="Long. Spacing, sx (in)"
              value={config.anchorLayout.spacing.longitudinal}
              onChange={(v) =>
                onLayoutChange({ spacing: { ...config.anchorLayout.spacing, longitudinal: v } })
              }
            />
            <NumField
              label="Trans. Spacing, sy (in)"
              value={config.anchorLayout.spacing.transverse}
              onChange={(v) =>
                onLayoutChange({ spacing: { ...config.anchorLayout.spacing, transverse: v } })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumField
              label="Edge Distance, ca1 (in)"
              value={config.anchorLayout.edgeDistance.ca1}
              onChange={(v) =>
                onLayoutChange({ edgeDistance: { ...config.anchorLayout.edgeDistance, ca1: v } })
              }
            />
            <NumField
              label="Edge Distance, ca2 (in)"
              value={config.anchorLayout.edgeDistance.ca2}
              onChange={(v) =>
                onLayoutChange({ edgeDistance: { ...config.anchorLayout.edgeDistance, ca2: v } })
              }
            />
          </div>
          <p className="text-xs text-muted-foreground italic">
            Total anchors: {config.anchorLayout.nLong * config.anchorLayout.nTrans}
          </p>
        </fieldset>
      </div>

      {/* Right: Anchor Layout Diagram */}
      <div className="flex flex-col items-center">
        <AnchorDiagram
          nLong={config.anchorLayout.nLong}
          nTrans={config.anchorLayout.nTrans}
          sx={config.anchorLayout.spacing.longitudinal}
          sy={config.anchorLayout.spacing.transverse}
          equipLength={equipLength}
          equipWidth={equipWidth}
        />
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        className="mt-1 w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
