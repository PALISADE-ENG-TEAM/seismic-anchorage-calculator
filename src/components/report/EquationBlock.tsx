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

  const approach = results.seismicApproach ?? 'general';
  const isFloorAccel = approach === 'floor-accel';

  // Approach-specific labels
  const hfLabel = approach === 'known-sfrs' && siteParams.Ta_approx
    ? 'Eq. 13.3-4 (period known)'
    : 'Eq. 13.3-5 (period unknown)';
  const rmuLabel = approach === 'known-sfrs'
    ? 'Eq. 13.3-6'
    : 'SFRS unknown, default';

  return (
    <div className="space-y-2">
      {/* 1. Fp equation */}
      {isFloorAccel ? (
        <ReportEquation
          label="Seismic Design Force (Floor Acceleration)"
          reference="ASCE 7-22 §13.3.1.1"
          equation={
            'F_p = A_i \\times \\frac{C_{AR}}{R_{po}} \\times I_p \\times W_p'
          }
          substitution={
            `F_p = ${fmt(siteParams.Ai_override ?? 0, 3)} \\times \\frac{${fmt(CAR, 2)}}{${fmt(Rpo, 2)}} \\times ${fmt(Ip, 1)} \\times ${fmt(Wp, 0)}`
          }
          result={`F_p = ${fmt(results.fpCalculated, 0)} \\text{ lbs}`}
        />
      ) : (
        <>
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
          <div className="text-xs text-muted-foreground pl-4 -mt-1">
            H<sub>f</sub> = {fmt(Hf, 3)} ({hfLabel}) &nbsp;|&nbsp; R<sub>&mu;</sub> = {fmt(Rmu, 3)} ({rmuLabel})
          </div>
        </>
      )}

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

      {/* === Rigid Bolt Group Equations (when applicable) === */}
      {results.boltGroup && (
        <>
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Rigid Bolt Group Analysis
            </p>
          </div>

          {/* Bolt group centroid */}
          <ReportEquation
            label="Bolt Group Centroid"
            reference="Rigid body mechanics"
            equation={
              '\\bar{x} = \\frac{\\sum x_i}{N}, \\quad \\bar{y} = \\frac{\\sum y_i}{N}'
            }
            substitution={
              `\\bar{x} = ${fmt(results.boltGroup.boltGroupCentroid.x, 1)}\\text{ in}, \\quad ` +
              `\\bar{y} = ${fmt(results.boltGroup.boltGroupCentroid.y, 1)}\\text{ in}`
            }
            result={
              `\\text{Centroid} = (${fmt(results.boltGroup.boltGroupCentroid.x, 1)}, ${fmt(results.boltGroup.boltGroupCentroid.y, 1)})\\text{ in}`
            }
          />

          {/* Polar moment of inertia */}
          <ReportEquation
            label="Polar Moment of Inertia"
            reference="Rigid body mechanics"
            equation={
              'I_p = \\sum(d_{xi}^2 + d_{yi}^2) = I_x + I_y'
            }
            substitution={
              `I_p = ${fmt(results.boltGroup.Ix, 1)} + ${fmt(results.boltGroup.Iy, 1)}`
            }
            result={
              `I_p = ${fmt(results.boltGroup.Ip, 1)}\\text{ in}^2`
            }
          />

          {/* Eccentricity */}
          {(Math.abs(results.boltGroup.eccentricity.ex) > 0.01 ||
            Math.abs(results.boltGroup.eccentricity.ey) > 0.01) && (
            <ReportEquation
              label="Load Eccentricity"
              reference="CG offset from centroid"
              equation={
                'e_x = x_{CG} - \\bar{x}, \\quad e_y = y_{CG} - \\bar{y}'
              }
              substitution={
                `e_x = ${fmt(results.boltGroup.cgPosition.x, 1)} - ${fmt(results.boltGroup.boltGroupCentroid.x, 1)}, \\quad ` +
                `e_y = ${fmt(results.boltGroup.cgPosition.y, 1)} - ${fmt(results.boltGroup.boltGroupCentroid.y, 1)}`
              }
              result={
                `e_x = ${fmt(results.boltGroup.eccentricity.ex, 2)}\\text{ in}, \\quad e_y = ${fmt(results.boltGroup.eccentricity.ey, 2)}\\text{ in}`
              }
            />
          )}

          {/* Torsional shear distribution */}
          <ReportEquation
            label="Torsional Shear Distribution"
            reference="Rigid body mechanics"
            equation={
              'V_{t,xi} = \\frac{-M_t \\cdot d_{yi}}{I_p}, \\quad V_{t,yi} = \\frac{M_t \\cdot d_{xi}}{I_p}'
            }
            substitution={
              `M_{t,X} = ${fmt(results.boltGroup.torsionalMomentX, 0)}\\text{ lb-in}, \\quad ` +
              `M_{t,Y} = ${fmt(results.boltGroup.torsionalMomentY, 0)}\\text{ lb-in}`
            }
            result={
              `\\text{See per-anchor forces table for individual bolt demands}`
            }
          />

          {/* Critical anchor */}
          {(() => {
            const crit = results.boltGroup.anchorForces.find(a => a.isCritical)
            if (!crit) return null
            return (
              <ReportEquation
                label="Critical Anchor Demands"
                reference={`Anchor ${crit.anchorId}`}
                equation={
                  'T_{u,crit}, \\quad V_{u,crit} \\quad \\text{(governing anchor)}'
                }
                substitution={
                  `T_{u} = ${fmt(crit.tCombined, 0)}\\text{ lbs}, \\quad V_{u} = ${fmt(crit.vCombined, 0)}\\text{ lbs}`
                }
                result={
                  `\\text{IR} = ${fmt(crit.interactionRatio, 3)} ${crit.interactionRatio <= 1.0 ? '\\leq' : '>'} 1.0 \\quad \\textbf{${crit.interactionRatio <= 1.0 ? 'PASS' : 'FAIL'}}`
                }
              />
            )
          })()}
        </>
      )}
    </div>
  );
}
