import type { CalculationResults, CapacityCheck, SiteParams, EquipmentProperties, AnchorageConfig } from '@/lib/types.ts';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { EquationBlock } from '@/components/report/EquationBlock.tsx';
import { EquipmentFBD } from '@/components/diagrams/EquipmentFBD.tsx';
import { AnchorDetailDiagram } from '@/components/diagrams/AnchorDetailDiagram.tsx';

export function ResultsTab({
  results,
  onCalculate,
  siteParams,
  equipProps,
  anchorConfig,
}: {
  results: CalculationResults | undefined;
  onCalculate: () => void;
  siteParams?: SiteParams;
  equipProps?: EquipmentProperties;
  anchorConfig?: AnchorageConfig;
}) {
  if (!results) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-12 h-12 text-warn mx-auto mb-4" />
        <h2 className="text-lg font-medium mb-2">No results yet</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Fill in Site, Properties, and Anchorage tabs, then click Calculate.
        </p>
        <button
          onClick={onCalculate}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 transition-colors"
        >
          CALCULATE
        </button>
      </div>
    );
  }

  const pass = results.overallStatus === 'PASS';

  return (
    <div className="space-y-6">
      {/* PASS/FAIL Banner */}
      <div
        className={`flex items-center gap-3 p-4 rounded-xl border-2 ${
          pass
            ? 'bg-pass/10 border-pass text-pass'
            : 'bg-fail/10 border-fail text-fail'
        }`}
      >
        {pass ? (
          <CheckCircle className="w-8 h-8 flex-shrink-0" />
        ) : (
          <XCircle className="w-8 h-8 flex-shrink-0" />
        )}
        <div>
          <h2 className="text-2xl font-bold">{results.overallStatus}</h2>
          <p className="text-sm opacity-80">
            Governing: {formatCheckName(results.governingCheck)} ({(results.maxUtilizationRatio * 100).toFixed(1)}% utilization)
          </p>
        </div>
        <div className="ml-auto">
          <button
            onClick={onCalculate}
            className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            Recalculate
          </button>
        </div>
      </div>

      {/* Engineering Warnings */}
      {results.warnings && results.warnings.length > 0 && (
        <div className="space-y-2">
          {results.warnings.map((w, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${
                w.severity === 'error'
                  ? 'bg-fail/10 border-fail/30 text-fail'
                  : w.severity === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400'
              }`}
            >
              {w.severity === 'error' ? (
                <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : w.severity === 'warning' ? (
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-mono text-xs mr-2">[{w.code}]</span>
                {w.message}
                <span className="text-xs opacity-70 ml-2">({w.codeRef})</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ψ Modification Factors */}
      {results.psiFactors && (
        <Section title="Modification Factors Applied (ACI 318-19)">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ValueCard label="ψed,N" value={results.psiFactors.psiEdN.toFixed(3)} sub="Edge (tension)" />
            <ValueCard label="ψc,N" value={results.psiFactors.psiCN.toFixed(3)} sub="Cracking (tension)" />
            <ValueCard label="ψed,V" value={results.psiFactors.psiEdV.toFixed(3)} sub="Edge (shear)" />
            <ValueCard label="ψc,V" value={results.psiFactors.psiCV.toFixed(3)} sub="Cracking (shear)" />
          </div>
          {results.psiFactors.psiHV !== 1.0 && (
            <div className="mt-2">
              <ValueCard label="ψh,V" value={results.psiFactors.psiHV.toFixed(3)} sub="Member thickness (shear)" />
            </div>
          )}
        </Section>
      )}

      {/* Seismic Force Breakdown */}
      <Section title="Seismic Force (ASCE 7-22 Eq. 13.3-1)">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ValueCard label="Hf" value={results.Hf.toFixed(3)} sub="Height factor" />
          <ValueCard label={"R\u03BC"} value={results.Rmu.toFixed(3)} sub="Ductility factor" />
          <ValueCard label="CAR" value={results.CAR.toFixed(2)} sub="Resonance factor" />
          <ValueCard label="Rpo" value={results.Rpo.toFixed(2)} sub="Strength factor" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <ValueCard label="Fp,calc" value={fmt(results.fpCalculated)} sub="Eq. 13.3-1" unit="lbs" />
          <ValueCard label="Fp,min" value={fmt(results.fpMinimum)} sub="Eq. 13.3-2" unit="lbs" />
          <ValueCard label="Fp,max" value={fmt(results.fpMaximum)} sub="Eq. 13.3-3" unit="lbs" />
          <ValueCard
            label="Fp,design"
            value={fmt(results.fpDesign)}
            sub="Governing"
            unit="lbs"
            highlight
          />
        </div>
      </Section>

      {/* Overturning Analysis */}
      <Section title="Overturning Analysis">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <ValueCard label="M_ot" value={fmt(results.overturnMoment)} unit="lb-ft" sub="Overturning" />
          <ValueCard label="M_r1" value={fmt(results.resistingMoment1)} unit="lb-ft" sub="Dir. 1 (along L)" />
          <ValueCard label="M_r2" value={fmt(results.resistingMoment2)} unit="lb-ft" sub="Dir. 2 (along W)" />
          <ValueCard label="M_net1" value={fmt(results.netUpliftMoment1)} unit="lb-ft" sub="Net Dir. 1" />
          <ValueCard label="M_net2" value={fmt(results.netUpliftMoment2)} unit="lb-ft" sub="Net Dir. 2" />
          <ValueCard
            label="Governing"
            value={results.governingDirection}
            sub={results.upliftOccurs ? 'Uplift occurs' : 'No uplift'}
            highlight
          />
        </div>
      </Section>

      {/* Free Body Diagram + Anchor Detail */}
      {equipProps && anchorConfig && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section title="Equipment Free Body Diagram">
            <EquipmentFBD
              length={equipProps.length}
              width={equipProps.width}
              height={equipProps.height}
              cgHeight={equipProps.cgHeight}
              Fp={results.fpDesign}
              Wp={equipProps.weight}
              Tu={results.tuPerAnchor}
              Vu={results.vuPerAnchor}
              governingDirection={results.governingDirection}
              upliftOccurs={results.upliftOccurs}
            />
          </Section>
          <Section title="Anchor Layout Detail">
            <AnchorDetailDiagram
              nLong={anchorConfig.anchorLayout.nLong}
              nTrans={anchorConfig.anchorLayout.nTrans}
              sx={anchorConfig.anchorLayout.spacing.longitudinal}
              sy={anchorConfig.anchorLayout.spacing.transverse}
              ca1={anchorConfig.anchorLayout.edgeDistance.ca1}
              equipLength={equipProps.length}
              equipWidth={equipProps.width}
              anchorDiameter={anchorConfig.anchorDiameter}
              Tu={results.tuPerAnchor}
              Vu={results.vuPerAnchor}
              governingDirection={results.governingDirection}
              upliftOccurs={results.upliftOccurs}
            />
          </Section>
        </div>
      )}

      {/* Individual Load Case Reactions */}
      <Section title="Load Case Reactions (before combinations)">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <ValueCard
            label="Dead Load (D)"
            value={fmt(results.loadCases.dead.verticalReaction)}
            unit="lbs/anchor"
            sub="Stabilizing (downward)"
          />
          <ValueCard
            label="Seismic Force (Eh)"
            value={fmt(results.loadCases.seismicFp.horizontalForce)}
            unit="lbs"
            sub="Horizontal, at CG"
          />
          <ValueCard
            label="Overturning (M_ot)"
            value={fmt(results.loadCases.seismicOverturn.moment)}
            unit="lb-ft"
            sub="Fp × hcg"
          />
          <ValueCard
            label="Tu per anchor (E only)"
            value={fmt(results.loadCases.seismicTensionPerAnchor)}
            unit="lbs"
            sub={`Before \u03A9\u2080p = ${results.Rpo > 0 ? (results.tuPerAnchor / Math.max(results.loadCases.seismicTensionPerAnchor, 0.001)).toFixed(2) : '—'}`}
          />
          <ValueCard
            label="Vu per anchor (E only)"
            value={fmt(results.loadCases.seismicShearPerAnchor)}
            unit="lbs"
            sub={`Before \u03A9\u2080p`}
          />
        </div>
      </Section>

      {/* Anchor Demands (with overstrength) */}
      <Section title={`Design Anchor Demands (with \u03A9\u2080p = ${results.upliftOccurs ? (results.tuPerAnchor / Math.max(results.loadCases.seismicTensionPerAnchor, 0.001)).toFixed(2) : '—'} overstrength)`}>
        <div className="grid grid-cols-2 gap-4">
          <ValueCard
            label="Tu per anchor"
            value={fmt(results.tuPerAnchor)}
            unit="lbs"
            sub={results.upliftOccurs ? 'Tension (uplift) — for capacity checks' : 'No uplift'}
            highlight={results.upliftOccurs}
          />
          <ValueCard
            label="Vu per anchor"
            value={fmt(results.vuPerAnchor)}
            unit="lbs"
            sub="Shear — for capacity checks"
          />
        </div>
      </Section>

      {/* Capacity Checks Table */}
      <Section title="Capacity Checks (ACI 318-19 Chapter 17)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-left">
                <th className="py-2 pr-4">Check</th>
                <th className="py-2 pr-4 text-right font-mono">Demand</th>
                <th className="py-2 pr-4 text-right font-mono">Capacity</th>
                <th className="py-2 pr-4 text-right font-mono">Ratio</th>
                <th className="py-2 pr-4 text-center">Status</th>
                <th className="py-2 text-right">Code Ref</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(results.checks)
                .filter(([, check]) => check !== null)
                .map(([key, check]) => (
                <CheckRow key={key} name={key} check={check!} isGoverning={key === results.governingCheck} />
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Equation Derivations */}
      {siteParams && equipProps && (
        <Section title="Equation Derivations (ASCE 7-22 + ACI 318-19)">
          <EquationBlock results={results} siteParams={siteParams} equipProps={equipProps} />
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ValueCard({
  label,
  value,
  sub,
  unit,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  unit?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg ${highlight ? 'bg-primary/10 border border-primary/30' : 'bg-background'}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-mono font-semibold">
        {value}
        {unit && <span className="text-xs text-muted-foreground ml-1">{unit}</span>}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function CheckRow({
  name,
  check,
  isGoverning,
}: {
  name: string;
  check: CapacityCheck;
  isGoverning: boolean;
}) {
  const pass = check.status === 'PASS';
  const isInteraction = name === 'interaction';

  return (
    <tr className={`border-b border-border/50 ${isGoverning ? 'bg-primary/5' : ''}`}>
      <td className="py-2 pr-4">
        <span className={isGoverning ? 'font-semibold text-primary' : ''}>
          {formatCheckName(name)}
        </span>
        {isGoverning && (
          <span className="ml-2 text-xs text-primary font-medium">GOVERNING</span>
        )}
      </td>
      <td className="py-2 pr-4 text-right font-mono">
        {isInteraction ? check.demand.toFixed(3) : fmt(check.demand)}
        {!isInteraction && <span className="text-xs text-muted-foreground ml-1">lbs</span>}
      </td>
      <td className="py-2 pr-4 text-right font-mono">
        {isInteraction ? '1.000' : fmt(check.capacity)}
        {!isInteraction && <span className="text-xs text-muted-foreground ml-1">lbs</span>}
      </td>
      <td className="py-2 pr-4 text-right font-mono font-medium">
        {(check.ratio * 100).toFixed(1)}%
      </td>
      <td className="py-2 pr-4 text-center">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
            pass ? 'bg-pass/20 text-pass' : 'bg-fail/20 text-fail'
          }`}
        >
          {check.status}
        </span>
      </td>
      <td className="py-2 text-right text-xs text-muted-foreground">{check.codeRef}</td>
    </tr>
  );
}

function formatCheckName(key: string): string {
  const names: Record<string, string> = {
    steelTension: 'Steel Tension',
    steelShear: 'Steel Shear',
    concreteBreakoutTension: 'Concrete Breakout (Tension)',
    concreteBreakoutShear: 'Concrete Breakout (Shear)',
    concretePryout: 'Concrete Pryout',
    pullout: 'Pullout',
    sideFaceBlowout: 'Side-Face Blowout',
    adhesiveBond: 'Adhesive Bond',
    interaction: 'Tension-Shear Interaction',
  };
  return names[key] || key;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
