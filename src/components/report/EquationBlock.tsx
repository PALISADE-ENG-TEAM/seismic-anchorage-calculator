import type {
  CalculationResults,
  SiteParams,
  EquipmentProperties,
} from '@/lib/types.ts';
import { ReportEquation } from './ReportEquation.tsx';

interface EquationBlockProps {
  results: CalculationResults;
  siteParams: SiteParams;
  equipProps: EquipmentProperties;
}

/** Format a number for LaTeX substitution strings. */
function fmt(n: number, decimals: number = 1): string {
  return n.toFixed(decimals);
}

/**
 * Renders the full set of "show your work" equations for a seismic
 * anchorage calculation in Breyer-style format.
 *
 * Each equation shows the symbolic formula, values substituted, and
 * the bold final result.
 */
export function EquationBlock({
  results,
  siteParams,
  equipProps,
}: EquationBlockProps) {
  const { SDS, Ip } = siteParams;
  const Wp = equipProps.weight;
  const { Hf, Rmu, CAR, Rpo } = results;

  // Anchor capacity values from checks
  const steelTension = results.checks.steelTension;
  const interaction = results.checks.interaction;

  // Governing direction determines the resisting moment arm
  const isLongGoverning = results.governingDirection === 'longitudinal';
  const resistingArm = isLongGoverning
    ? equipProps.length / 2
    : equipProps.width / 2;
  const armLabel = isLongGoverning ? 'L' : 'W';

  // CG height in feet for moment calc
  const hcgFt = equipProps.cgHeight / 12;

  return (
    <div className="space-y-2">
      {/* 1. Fp equation — ASCE 7-22 Eq. 13.3-1 */}
      <ReportEquation
        label="Seismic Design Force"
        reference="ASCE 7-22 Eq. 13.3-1"
        equation={
          'F_p = 0.4 \\times S_{DS} \\times I_p \\times W_p \\times ' +
          '\\frac{H_f}{R_\\mu} \\times \\frac{C_{AR}}{R_{po}}'
        }
        substitution={
          `F_p = 0.4 \\times ${fmt(SDS, 3)} \\times ${fmt(Ip, 1)} \\times ${fmt(Wp, 0)} \\times ` +
          `\\frac{${fmt(Hf, 3)}}{${fmt(Rmu, 3)}} \\times \\frac{${fmt(CAR, 2)}}{${fmt(Rpo, 2)}}`
        }
        result={`F_p = ${fmt(results.fpCalculated, 0)} \\text{ lbs}`}
      />

      {/* 2. Fp minimum — ASCE 7-22 Eq. 13.3-2 */}
      <ReportEquation
        label="Minimum Seismic Force"
        reference="ASCE 7-22 Eq. 13.3-2"
        equation={'F_{p,min} = 0.3 \\times S_{DS} \\times I_p \\times W_p'}
        substitution={
          `F_{p,min} = 0.3 \\times ${fmt(SDS, 3)} \\times ${fmt(Ip, 1)} \\times ${fmt(Wp, 0)}`
        }
        result={`F_{p,min} = ${fmt(results.fpMinimum, 0)} \\text{ lbs}`}
      />

      {/* 3. Fp maximum — ASCE 7-22 Eq. 13.3-3 */}
      <ReportEquation
        label="Maximum Seismic Force"
        reference="ASCE 7-22 Eq. 13.3-3"
        equation={'F_{p,max} = 1.6 \\times S_{DS} \\times I_p \\times W_p'}
        substitution={
          `F_{p,max} = 1.6 \\times ${fmt(SDS, 3)} \\times ${fmt(Ip, 1)} \\times ${fmt(Wp, 0)}`
        }
        result={`F_{p,max} = ${fmt(results.fpMaximum, 0)} \\text{ lbs}`}
      />

      {/* 4. Overturning moment */}
      <ReportEquation
        label="Overturning Moment"
        reference="Statics"
        equation={'M_{OT} = F_p \\times h_{cg}'}
        substitution={
          `M_{OT} = ${fmt(results.fpDesign, 0)} \\times ${fmt(hcgFt, 2)}`
        }
        result={`M_{OT} = ${fmt(results.overturnMoment, 0)} \\text{ lb-ft}`}
      />

      {/* 5. Resisting moment (governing direction) */}
      <ReportEquation
        label={`Resisting Moment (${isLongGoverning ? 'along length' : 'along width'})`}
        reference="0.9D Stabilizing"
        equation={`M_R = 0.9 \\times W_p \\times \\frac{${armLabel}}{2 \\times 12}`}
        substitution={
          `M_R = 0.9 \\times ${fmt(Wp, 0)} \\times \\frac{${fmt(resistingArm * 2, 1)} \\text{ in}}{24}`
        }
        result={
          `M_R = ${fmt(isLongGoverning ? results.resistingMoment1 : results.resistingMoment2, 0)} \\text{ lb-ft}`
        }
      />

      {/* 6. Steel tension capacity */}
      <ReportEquation
        label="Steel Tension Capacity"
        reference="ACI 318-19 Eq. 17.6.1.2"
        equation={'\\phi N_{sa} = \\phi \\times A_{se} \\times f_{uta}'}
        substitution={
          `\\phi N_{sa} = 0.75 \\times ${fmt(steelTension.capacity / 0.75, 0)}`
        }
        result={`\\phi N_{sa} = ${fmt(steelTension.capacity, 0)} \\text{ lbs}`}
      />

      {/* 7. Interaction equation */}
      <ReportEquation
        label="Tension-Shear Interaction"
        reference="ACI 318-19 Eq. 17.8.3"
        equation={
          '\\left(\\frac{T_u}{\\phi N_n}\\right)^{5/3} + ' +
          '\\left(\\frac{V_u}{\\phi V_n}\\right)^{5/3} \\leq 1.0'
        }
        substitution={
          `\\left(\\frac{${fmt(results.tuPerAnchor, 0)}}{${fmt(Math.min(results.checks.steelTension.capacity, results.checks.concreteBreakoutTension.capacity), 0)}}\\right)^{5/3} + ` +
          `\\left(\\frac{${fmt(results.vuPerAnchor, 0)}}{${fmt(Math.min(results.checks.steelShear.capacity, results.checks.concreteBreakoutShear.capacity, results.checks.concretePryout.capacity), 0)}}\\right)^{5/3}`
        }
        result={
          `${fmt(interaction.demand, 3)} ${interaction.demand <= 1.0 ? '\\leq' : '>'} 1.0 \\quad \\textbf{${interaction.status}}`
        }
      />
    </div>
  );
}
