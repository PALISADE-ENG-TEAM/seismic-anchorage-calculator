import type { Calculation, CapacityCheck } from '@/lib/types.ts';
import { Printer } from 'lucide-react';
import { EquationBlock } from '@/components/report/EquationBlock.tsx';
import { EquipmentFBD } from '@/components/diagrams/EquipmentFBD.tsx';

function fmt(n: number, decimals = 1): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const CHECK_LABELS: Record<string, string> = {
  steelTension: 'Steel Strength in Tension',
  steelShear: 'Steel Strength in Shear',
  concreteBreakoutTension: 'Concrete Breakout in Tension',
  concreteBreakoutShear: 'Concrete Breakout in Shear',
  concretePryout: 'Concrete Pryout',
  interaction: 'Tension-Shear Interaction',
};

export function ReportTab({ calc }: { calc: Calculation }) {
  const r = calc.results;
  const sp = calc.siteParams;
  const eq = calc.equipmentProperties;
  const an = calc.anchorageConfig;

  if (!r) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p className="text-lg">Run calculation first to generate the report.</p>
      </div>
    );
  }

  const zOverH = sp.buildingHeight > 0 ? sp.attachmentHeight / sp.buildingHeight : 0;
  const nAnchors = an.anchorLayout.nLong * an.anchorLayout.nTrans;
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-4">
      {/* Print Button */}
      <div className="no-print flex justify-end">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md font-semibold hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Print / Save PDF
        </button>
      </div>

      {/* Report Content */}
      <div className="bg-card text-card-foreground rounded-lg p-8 print:bg-white print:text-black print:p-0 print:rounded-none">
        {/* Header */}
        <header className="text-center border-b-2 border-border print:border-black pb-6 mb-6">
          <h1 className="text-2xl font-bold tracking-wide">
            SEISMIC ANCHORAGE CALCULATION
          </h1>
          <p className="mt-2 text-lg">{calc.name}</p>
          {calc.description && (
            <p className="mt-1 text-sm text-muted-foreground print:text-gray-600">
              {calc.description}
            </p>
          )}
          <p className="mt-3 text-sm font-semibold">
            Code References: ASCE 7-22 Chapter 13 + ACI 318-19 Chapter 17
          </p>
          <p className="mt-1 text-xs text-muted-foreground print:text-gray-500">
            Date: {today}
          </p>
        </header>

        {/* Section 1: Site Parameters */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-border print:border-gray-400 pb-1 mb-3">
            1. Site Parameters
          </h2>
          <table className="w-full text-sm border-collapse">
            <tbody>
              <Row label="S_DS" value={fmt(sp.SDS, 3)} unit="g" />
              <Row label="S_D1" value={fmt(sp.SD1, 3)} unit="g" />
              <Row label="Site Class" value={sp.siteClass} />
              <Row label="Risk Category" value={sp.riskCategory} />
              <Row label="Component Importance Factor, I_p" value={fmt(sp.Ip, 1)} />
              <Row label="Building Height, h" value={fmt(sp.buildingHeight, 1)} unit="ft" />
              <Row label="Attachment Height, z" value={fmt(sp.attachmentHeight, 1)} unit="ft" />
              <Row label="z/h" value={fmt(zOverH, 3)} />
              <Row label="SFRS Type" value={sp.sfrsType} />
              <Row label="R (Building)" value={fmt(sp.R_building, 1)} />
              <Row label={'\u03A9\u2080 (Building)'} value={fmt(sp.Omega0_building, 1)} />
            </tbody>
          </table>
        </section>

        {/* Section 2: Equipment Properties */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-border print:border-gray-400 pb-1 mb-3">
            2. Equipment Properties
          </h2>
          <table className="w-full text-sm border-collapse">
            <tbody>
              <Row label="Manufacturer" value={eq.manufacturer || '\u2014'} />
              <Row label="Model" value={eq.modelNumber || '\u2014'} />
              <Row label="Type" value={eq.equipmentType || '\u2014'} />
              <Row label="Component Type" value={eq.componentType || '\u2014'} />
              <Row label="Weight, W_p" value={fmt(eq.weight, 0)} unit="lbs" />
              <Row
                label="Dimensions (L x W x H)"
                value={`${fmt(eq.length, 1)} x ${fmt(eq.width, 1)} x ${fmt(eq.height, 1)}`}
                unit="in"
              />
              <Row label="CG Height, h_cg" value={fmt(eq.cgHeight, 1)} unit="in" />
            </tbody>
          </table>
          <h3 className="text-sm font-semibold mt-4 mb-2 text-muted-foreground print:text-gray-600">
            Component Parameters (ASCE 7-22 Table 13.6-1)
          </h3>
          <table className="w-full text-sm border-collapse">
            <tbody>
              <Row label="C_AR" value={fmt(r.CAR, 2)} />
              <Row label="R_po" value={fmt(r.Rpo, 2)} />
              <Row label={'\u03A9\u2080p'} value={fmt(eq.Omega0p, 2)} />
            </tbody>
          </table>
        </section>

        {/* Section 3: Seismic Force */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-border print:border-gray-400 pb-1 mb-3">
            3. Seismic Force (ASCE 7-22 Eq. 13.3-1)
          </h2>
          <div className="bg-muted/50 print:bg-gray-100 rounded p-4 font-mono text-sm mb-4">
            <p className="mb-2">
              F_p = 0.4 &times; S_DS &times; I_p &times; W_p &times; (H_f / R_mu) &times; C_AR / R_po
            </p>
            <p className="text-xs text-muted-foreground print:text-gray-600">
              F_p = 0.4 &times; {fmt(sp.SDS, 3)} &times; {fmt(sp.Ip, 1)} &times;{' '}
              {fmt(eq.weight, 0)} &times; ({fmt(r.Hf, 3)} / {fmt(r.Rmu, 3)}) &times;{' '}
              {fmt(r.CAR, 2)} / {fmt(r.Rpo, 2)}
            </p>
          </div>
          <table className="w-full text-sm border-collapse">
            <tbody>
              <Row label="H_f (Height Factor)" value={fmt(r.Hf, 3)} />
              <Row label="R_\u03BC (Structure Ductility Reduction)" value={fmt(r.Rmu, 3)} />
              <Row label="F_p,calc (Eq. 13.3-1)" value={fmt(r.fpCalculated, 0)} unit="lbs" />
              <Row label="F_p,min (Eq. 13.3-2)" value={fmt(r.fpMinimum, 0)} unit="lbs" />
              <Row label="F_p,max (Eq. 13.3-3)" value={fmt(r.fpMaximum, 0)} unit="lbs" />
              <Row
                label="F_p,design (Governing)"
                value={fmt(r.fpDesign, 0)}
                unit="lbs"
                bold
              />
            </tbody>
          </table>
        </section>

        {/* Section 4: Overturning Analysis */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-border print:border-gray-400 pb-1 mb-3">
            4. Overturning Analysis
          </h2>
          <table className="w-full text-sm border-collapse">
            <tbody>
              <Row
                label="Overturning Moment, M_ot = F_p \u00D7 h_cg"
                value={fmt(r.overturnMoment, 0)}
                unit="lb-ft"
              />
              <Row
                label="Resisting Moment, M_r1 (Dir. 1 \u2014 longitudinal) = 0.9W \u00D7 L/2"
                value={fmt(r.resistingMoment1, 0)}
                unit="lb-ft"
              />
              <Row
                label="Resisting Moment, M_r2 (Dir. 2 \u2014 transverse) = 0.9W \u00D7 W/2"
                value={fmt(r.resistingMoment2, 0)}
                unit="lb-ft"
              />
              <Row
                label="Net Uplift Moment, M_net1 (Dir. 1)"
                value={fmt(r.netUpliftMoment1, 0)}
                unit="lb-ft"
              />
              <Row
                label="Net Uplift Moment, M_net2 (Dir. 2)"
                value={fmt(r.netUpliftMoment2, 0)}
                unit="lb-ft"
              />
            </tbody>
          </table>
          <p className="mt-3 text-sm">
            <span className="font-semibold">Governing Direction:</span>{' '}
            <span className="font-mono">
              {r.governingDirection === 'longitudinal' ? 'Direction 1 (Longitudinal)' : 'Direction 2 (Transverse)'}
            </span>
            {' \u2014 '}
            {r.upliftOccurs ? (
              <span className="text-warn font-semibold">Uplift occurs</span>
            ) : (
              <span className="text-pass font-semibold">No uplift</span>
            )}
          </p>
        </section>

        {/* Section 5: Anchor Demands */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-border print:border-gray-400 pb-1 mb-3">
            5. Anchor Demands
          </h2>
          <table className="w-full text-sm border-collapse">
            <tbody>
              <Row
                label={`Tension per Anchor, T_u = M_net / (n_anchors_tension \u00D7 d)`}
                value={fmt(r.tuPerAnchor, 0)}
                unit="lbs"
              />
              <Row
                label={`Shear per Anchor, V_u = F_p / n_total (${nAnchors} anchors)`}
                value={fmt(r.vuPerAnchor, 0)}
                unit="lbs"
              />
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground print:text-gray-600">
            Note: Anchor demands include the \u03A9\u2080p = {fmt(eq.Omega0p, 1)} overstrength
            factor per ASCE 7-22 Section 13.4.2.
          </p>
        </section>

        {/* Section 6: Capacity Checks */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-border print:border-gray-400 pb-1 mb-3">
            6. Capacity Checks (ACI 318-19 Ch. 17)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse border border-border print:border-gray-400">
              <thead>
                <tr className="bg-muted/50 print:bg-gray-100">
                  <th className="border border-border print:border-gray-400 px-3 py-2 text-left font-semibold">
                    Check
                  </th>
                  <th className="border border-border print:border-gray-400 px-3 py-2 text-right font-semibold">
                    Demand (lbs)
                  </th>
                  <th className="border border-border print:border-gray-400 px-3 py-2 text-right font-semibold">
                    Capacity (lbs)
                  </th>
                  <th className="border border-border print:border-gray-400 px-3 py-2 text-right font-semibold">
                    Ratio
                  </th>
                  <th className="border border-border print:border-gray-400 px-3 py-2 text-center font-semibold">
                    Status
                  </th>
                  <th className="border border-border print:border-gray-400 px-3 py-2 text-left font-semibold">
                    Code Ref
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(r.checks).map(([key, check]) => (
                  <CheckRow
                    key={key}
                    label={CHECK_LABELS[key] ?? key}
                    check={check}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 7: Equipment Free Body Diagram */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-border print:border-gray-400 pb-1 mb-3">
            7. Equipment Free Body Diagram
          </h2>
          <div className="max-w-lg mx-auto">
            <EquipmentFBD
              length={eq.length}
              width={eq.width}
              height={eq.height}
              cgHeight={eq.cgHeight}
              Fp={r.fpDesign}
              Wp={eq.weight}
              Tu={r.tuPerAnchor}
              Vu={r.vuPerAnchor}
              governingDirection={r.governingDirection}
              upliftOccurs={r.upliftOccurs}
            />
          </div>
        </section>

        {/* Section 8: Equation Derivations */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-border print:border-gray-400 pb-1 mb-3">
            8. Equation Derivations
          </h2>
          <EquationBlock results={r} siteParams={sp} equipProps={eq} />
        </section>

        {/* Section 9: Summary */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-border print:border-gray-400 pb-1 mb-3">
            9. Summary
          </h2>
          <div className="flex flex-col items-center py-6">
            <div
              className={`text-4xl font-bold tracking-wider px-8 py-3 rounded-md border-2 ${
                r.overallStatus === 'PASS'
                  ? 'text-pass border-pass print:text-green-700 print:border-green-700'
                  : 'text-fail border-fail print:text-red-700 print:border-red-700'
              }`}
            >
              {r.overallStatus}
            </div>
            <p className="mt-4 text-sm">
              <span className="font-semibold">Governing Check:</span>{' '}
              <span className="font-mono">{r.governingCheck}</span>
            </p>
            <p className="text-sm">
              <span className="font-semibold">Max Utilization Ratio:</span>{' '}
              <span className="font-mono">{fmt(r.maxUtilizationRatio, 3)}</span>
            </p>
          </div>

          {/* Signature Block */}
          <div className="mt-8 pt-8 border-t border-border print:border-gray-400">
            <div className="grid grid-cols-2 gap-8 max-w-lg mx-auto">
              <div>
                <div className="border-b border-border print:border-black h-16" />
                <p className="text-xs mt-1 text-muted-foreground print:text-gray-600">
                  Engineer Signature / PE Stamp
                </p>
              </div>
              <div>
                <div className="border-b border-border print:border-black h-16" />
                <p className="text-xs mt-1 text-muted-foreground print:text-gray-600">Date</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── Helper: Parameter Row ───────────────────────────────────────────── */

function Row({
  label,
  value,
  unit,
  bold,
}: {
  label: string;
  value: string;
  unit?: string;
  bold?: boolean;
}) {
  return (
    <tr className="border-b border-border/50 print:border-gray-200">
      <td className="py-1.5 pr-4 text-muted-foreground print:text-gray-600">{label}</td>
      <td className={`py-1.5 font-mono text-right ${bold ? 'font-bold' : ''}`}>
        {value}
        {unit && <span className="text-xs text-muted-foreground print:text-gray-500 ml-1">{unit}</span>}
      </td>
    </tr>
  );
}

/* ── Helper: Capacity Check Row ──────────────────────────────────────── */

function CheckRow({ label, check }: { label: string; check: CapacityCheck }) {
  const isPassing = check.status === 'PASS';
  return (
    <tr className="border-b border-border/50 print:border-gray-200">
      <td className="border border-border print:border-gray-400 px-3 py-2">{label}</td>
      <td className="border border-border print:border-gray-400 px-3 py-2 text-right font-mono">
        {fmt(check.demand, 0)}
      </td>
      <td className="border border-border print:border-gray-400 px-3 py-2 text-right font-mono">
        {fmt(check.capacity, 0)}
      </td>
      <td className="border border-border print:border-gray-400 px-3 py-2 text-right font-mono">
        {fmt(check.ratio, 3)}
      </td>
      <td
        className={`border border-border print:border-gray-400 px-3 py-2 text-center font-bold ${
          isPassing
            ? 'text-pass print:text-green-700'
            : 'text-fail print:text-red-700'
        }`}
      >
        {check.status}
      </td>
      <td className="border border-border print:border-gray-400 px-3 py-2 text-xs font-mono">
        {check.codeRef}
      </td>
    </tr>
  );
}
