import { useState } from 'react';
import type { AnchorageConfig, AnchorType, AnchorMaterial, AnchorPosition, AnalysisMethod } from '@/lib/types.ts';
import { ANCHOR_STEEL_PROPERTIES, CONCRETE_STRENGTHS } from '@/lib/constants.ts';
import { ANCHOR_PRODUCTS, getProductCapacity } from '@/lib/anchor-products.ts';
import { AnchorDiagram } from '@/components/diagrams/AnchorDiagram.tsx';
import { generateAnchorPositions } from '@/lib/calculations.ts';

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
  const isRBG = config.anchorLayout.analysisMethod === 'rigid-bolt-group';

  const handlePatternChange = (pattern: string) => {
    const [nL, nT] = pattern.split('x').map(Number);
    if (isRBG) {
      // In RBG mode, also generate anchor positions from the pattern
      const positions = generateAnchorPositions(
        nL, nT,
        config.anchorLayout.spacing.longitudinal,
        config.anchorLayout.spacing.transverse,
        equipLength, equipWidth
      );
      onLayoutChange({ pattern, nLong: nL, nTrans: nT, anchors: positions });
    } else {
      onLayoutChange({ pattern, nLong: nL, nTrans: nT });
    }
  };

  const handleAnalysisMethodChange = (method: AnalysisMethod) => {
    if (method === 'rigid-bolt-group' && !config.anchorLayout.anchors) {
      // Generate initial positions from current grid params
      const positions = generateAnchorPositions(
        config.anchorLayout.nLong,
        config.anchorLayout.nTrans,
        config.anchorLayout.spacing.longitudinal,
        config.anchorLayout.spacing.transverse,
        equipLength, equipWidth
      );
      onLayoutChange({ analysisMethod: method, anchors: positions, pivotMethod: 'centroid' });
    } else {
      onLayoutChange({ analysisMethod: method });
    }
  };

  const handleSpacingChange = (key: 'longitudinal' | 'transverse', v: number) => {
    const newSpacing = { ...config.anchorLayout.spacing, [key]: v };
    if (isRBG) {
      // Regenerate positions when spacing changes in RBG mode
      const positions = generateAnchorPositions(
        config.anchorLayout.nLong,
        config.anchorLayout.nTrans,
        newSpacing.longitudinal,
        newSpacing.transverse,
        equipLength, equipWidth
      );
      onLayoutChange({ spacing: newSpacing, anchors: positions });
    } else {
      onLayoutChange({ spacing: newSpacing });
    }
  };

  const handleAnchorPositionChange = (id: string, field: 'x' | 'y', value: number) => {
    const anchors = (config.anchorLayout.anchors ?? []).map(a =>
      a.id === id ? { ...a, [field]: value } : a
    );
    onLayoutChange({ anchors });
  };

  const handleAddAnchor = () => {
    const anchors = config.anchorLayout.anchors ?? [];
    const newId = `a-custom-${Date.now()}`;
    // Place near center of equipment
    const newAnchor: AnchorPosition = {
      id: newId,
      x: equipLength / 2,
      y: equipWidth / 2,
    };
    onLayoutChange({ anchors: [...anchors, newAnchor], pattern: 'custom' });
  };

  const handleRemoveAnchor = (id: string) => {
    const anchors = (config.anchorLayout.anchors ?? []).filter(a => a.id !== id);
    onLayoutChange({ anchors, pattern: 'custom' });
  };

  const handleDiagramClick = (x: number, y: number) => {
    if (!isRBG) return;
    // Snap to 0.5" grid
    const snappedX = Math.round(x * 2) / 2;
    const snappedY = Math.round(y * 2) / 2;
    const anchors = config.anchorLayout.anchors ?? [];
    const newId = `a-click-${Date.now()}`;
    onLayoutChange({
      anchors: [...anchors, { id: newId, x: snappedX, y: snappedY }],
      pattern: 'custom',
    });
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
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.crackedConcrete ?? true}
                onChange={(e) => onChange({ crackedConcrete: e.target.checked })}
                className="w-4 h-4 rounded border-border text-primary focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground">Cracked Concrete</span>
            </label>
            <NumField
              label="Member Thickness, ha (in)"
              value={config.memberThickness ?? 0}
              onChange={(v) => onChange({ memberThickness: v })}
              step={0.5}
            />
          </div>
        </fieldset>

        {/* Manufacturer Product Selection */}
        {config.anchorType !== 'cast-in' && (
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Manufacturer Product (Optional)
            </legend>
            <ProductSelector
              config={config}
              onChange={onChange}
            />
          </fieldset>
        )}

        {/* Anchor Layout */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Anchor Layout
          </legend>

          {/* Analysis Method Toggle */}
          <div className="flex gap-1 p-1 bg-background border border-border rounded-lg">
            <button
              onClick={() => handleAnalysisMethodChange('simple')}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                !isRBG
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Simple
            </button>
            <button
              onClick={() => handleAnalysisMethodChange('rigid-bolt-group')}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isRBG
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Rigid Bolt Group
            </button>
          </div>

          {/* Pivot Method (RBG only) */}
          {isRBG && (
            <div className="flex gap-1 p-1 bg-background border border-border rounded-lg">
              <button
                onClick={() => onLayoutChange({ pivotMethod: 'centroid' })}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  (config.anchorLayout.pivotMethod ?? 'centroid') === 'centroid'
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Pivot: Centroid
              </button>
              <button
                onClick={() => onLayoutChange({ pivotMethod: 'compression-edge' })}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  config.anchorLayout.pivotMethod === 'compression-edge'
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Pivot: Compression Edge
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs text-muted-foreground">Pattern {isRBG ? '(Preset)' : ''}</span>
              <select
                value={config.anchorLayout.pattern}
                onChange={(e) => handlePatternChange(e.target.value)}
                className="mt-1 w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {PATTERNS.map((p) => (
                  <option key={p} value={p}>{p} ({p.split('x').map(Number).reduce((a, b) => a * b)} anchors)</option>
                ))}
                {config.anchorLayout.pattern === 'custom' && (
                  <option value="custom">Custom</option>
                )}
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
              onChange={(v) => handleSpacingChange('longitudinal', v)}
            />
            <NumField
              label="Trans. Spacing, sy (in)"
              value={config.anchorLayout.spacing.transverse}
              onChange={(v) => handleSpacingChange('transverse', v)}
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

          {/* Anchor Coordinate Table (RBG only) */}
          {isRBG && config.anchorLayout.anchors && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Anchor Coordinates ({config.anchorLayout.anchors.length} bolts)
                </span>
                <button
                  onClick={handleAddAnchor}
                  className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  + Add Anchor
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-background sticky top-0">
                    <tr className="border-b border-border">
                      <th className="py-1 px-2 text-left text-muted-foreground">ID</th>
                      <th className="py-1 px-2 text-right text-muted-foreground">X (in)</th>
                      <th className="py-1 px-2 text-right text-muted-foreground">Y (in)</th>
                      <th className="py-1 px-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.anchorLayout.anchors.map((a) => (
                      <tr key={a.id} className="border-b border-border/50 hover:bg-primary/5">
                        <td className="py-1 px-2 font-mono text-muted-foreground">{a.id}</td>
                        <td className="py-1 px-2">
                          <input
                            type="number"
                            value={a.x}
                            onChange={(e) => handleAnchorPositionChange(a.id, 'x', parseFloat(e.target.value) || 0)}
                            step={0.5}
                            className="w-full text-right font-mono px-1 py-0.5 bg-background border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </td>
                        <td className="py-1 px-2">
                          <input
                            type="number"
                            value={a.y}
                            onChange={(e) => handleAnchorPositionChange(a.id, 'y', parseFloat(e.target.value) || 0)}
                            step={0.5}
                            className="w-full text-right font-mono px-1 py-0.5 bg-background border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </td>
                        <td className="py-1 px-2 text-center">
                          <button
                            onClick={() => handleRemoveAnchor(a.id)}
                            className="text-fail hover:text-fail/70 font-bold"
                            title="Remove anchor"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Click on the diagram to add anchors. Origin (0,0) = bottom-left corner of equipment.
              </p>
            </div>
          )}

          {!isRBG && (
            <p className="text-xs text-muted-foreground italic">
              Total anchors: {config.anchorLayout.nLong * config.anchorLayout.nTrans}
            </p>
          )}
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
          anchors={isRBG ? config.anchorLayout.anchors : undefined}
          interactive={isRBG}
          onAnchorClick={isRBG ? handleDiagramClick : undefined}
        />
      </div>
    </div>
  );
}

function ProductSelector({
  config,
  onChange,
}: {
  config: AnchorageConfig;
  onChange: (updates: Partial<AnchorageConfig>) => void;
}) {
  const [selectedProductId, setSelectedProductId] = useState(config.selectedProduct?.productId ?? '');

  const filteredProducts = ANCHOR_PRODUCTS.filter(p => {
    if (config.anchorType === 'post-installed-adhesive') return p.type === 'adhesive';
    return p.type !== 'adhesive'; // expansion, screw, undercut
  });

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    if (!productId) {
      onChange({ selectedProduct: undefined });
      return;
    }
    const product = ANCHOR_PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    // Find matching capacity data
    const cap = getProductCapacity(product, config.anchorDiameter, config.embedmentDepth, config.concreteStrength);

    onChange({
      selectedProduct: {
        productId: product.id,
        manufacturer: product.manufacturer,
        productLine: product.productLine,
        esrNumber: product.esrNumber,
        Np_cracked: cap?.Np_cracked,
        Np_uncracked: cap?.Np_uncracked,
        tau_cr_cracked: cap?.tau_cr_cracked,
        tau_cr_uncracked: cap?.tau_cr_uncracked,
        minEdgeDistance: cap?.minEdgeDistance,
        minSpacing: cap?.minSpacing,
        criticalEdgeDistance: cap?.criticalEdgeDistance,
      },
    });
  };

  return (
    <div className="space-y-2">
      <select
        value={selectedProductId}
        onChange={(e) => handleProductChange(e.target.value)}
        className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">— No product selected (generic ACI formulas) —</option>
        {filteredProducts.map(p => (
          <option key={p.id} value={p.id}>
            {p.manufacturer} {p.productLine} ({p.esrNumber}) — {p.type}
          </option>
        ))}
      </select>
      {config.selectedProduct && (
        <div className="text-xs text-muted-foreground bg-background rounded-lg p-2 border border-border">
          <p className="font-medium">{config.selectedProduct.manufacturer} {config.selectedProduct.productLine}</p>
          <p>ICC-ES: {config.selectedProduct.esrNumber}</p>
          {config.selectedProduct.minEdgeDistance && (
            <p>Min edge: {config.selectedProduct.minEdgeDistance}" | Min spacing: {config.selectedProduct.minSpacing}"</p>
          )}
          {config.selectedProduct.tau_cr_cracked && (
            <p>Bond stress (cracked): {config.selectedProduct.tau_cr_cracked} psi</p>
          )}
        </div>
      )}
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
