import { useState, useCallback } from 'react';
import type { Calculation, SiteParams, EquipmentProperties, AnchorageConfig } from '@/lib/types.ts';
import {
  getCalculations,
  getCalculation,
  saveCalculation,
  deleteCalculation as removeCalc,
  generateId,
} from '@/lib/storage.ts';
import { runCalculation } from '@/lib/calculations.ts';

const defaultSiteParams: SiteParams = {
  address: '',
  latitude: 0,
  longitude: 0,
  SDS: 0,
  SD1: 0,
  Ss: 0,
  S1: 0,
  siteClass: 'D',
  riskCategory: 'II',
  Ip: 1.0,
  buildingHeight: 0,
  attachmentHeight: 0,
  seismicDesignCategory: '',
  sfrsType: 'Unknown / Not specified',
  R_building: 0,
  Omega0_building: 0,
  Ie_building: 1.0,
  Ta_approx: null,
  seismicApproach: 'general',
  Ai_override: null,
};

const defaultEquipmentProperties: EquipmentProperties = {
  manufacturer: '',
  modelNumber: '',
  equipmentType: '',
  componentType: 'Wet-side HVAC (boilers, chillers, cooling towers)',
  weight: 0,
  length: 0,
  width: 0,
  height: 0,
  cgHeight: 0,
  CAR_atGrade: 1.0,
  CAR_aboveGrade: 1.0,
  Rpo: 1.5,
  Omega0p: 2.0,
};

const defaultAnchorageConfig: AnchorageConfig = {
  anchorType: 'post-installed-expansion',
  anchorMaterial: 'F1554-36',
  anchorDiameter: 0.625,
  embedmentDepth: 5,
  concreteStrength: 4000,
  anchorLayout: {
    pattern: '2x2',
    nLong: 2,
    nTrans: 2,
    spacing: { longitudinal: 48, transverse: 24 },
    edgeDistance: { ca1: 6, ca2: 6 },
  },
};

export function useCalculations(projectId: string) {
  const [calculations, setCalculations] = useState<Calculation[]>(() =>
    getCalculations(projectId)
  );

  const refresh = useCallback(() => {
    setCalculations(getCalculations(projectId));
  }, [projectId]);

  const createCalculation = useCallback(
    (name: string, description: string) => {
      const calc: Calculation = {
        id: generateId(),
        projectId,
        name,
        description,
        status: 'draft',
        siteParams: { ...defaultSiteParams },
        equipmentProperties: { ...defaultEquipmentProperties },
        anchorageConfig: {
          ...defaultAnchorageConfig,
          anchorLayout: {
            ...defaultAnchorageConfig.anchorLayout,
            spacing: { ...defaultAnchorageConfig.anchorLayout.spacing },
            edgeDistance: { ...defaultAnchorageConfig.anchorLayout.edgeDistance },
          },
        },
      };
      saveCalculation(calc);
      refresh();
      return calc;
    },
    [projectId, refresh]
  );

  const deleteCalculation = useCallback(
    (id: string) => {
      removeCalc(id);
      refresh();
    },
    [refresh]
  );

  return { calculations, createCalculation, deleteCalculation, refresh };
}

export function useCalculationDetail(calcId: string) {
  const [calc, setCalc] = useState<Calculation | null>(() =>
    getCalculation(calcId) ?? null
  );

  const update = useCallback(
    (updates: Partial<Calculation>) => {
      if (!calc) return;
      const updated = { ...calc, ...updates };
      saveCalculation(updated);
      setCalc(updated);
    },
    [calc]
  );

  const updateSiteParams = useCallback(
    (params: Partial<SiteParams>) => {
      if (!calc) return;
      const updated = {
        ...calc,
        siteParams: { ...calc.siteParams, ...params },
      };
      saveCalculation(updated);
      setCalc(updated);
    },
    [calc]
  );

  const updateEquipment = useCallback(
    (props: Partial<EquipmentProperties>) => {
      if (!calc) return;
      const updated = {
        ...calc,
        equipmentProperties: { ...calc.equipmentProperties, ...props },
      };
      saveCalculation(updated);
      setCalc(updated);
    },
    [calc]
  );

  const updateAnchorage = useCallback(
    (config: Partial<AnchorageConfig>) => {
      if (!calc) return;
      const updated = {
        ...calc,
        anchorageConfig: { ...calc.anchorageConfig, ...config },
      };
      saveCalculation(updated);
      setCalc(updated);
    },
    [calc]
  );

  const updateAnchorLayout = useCallback(
    (layout: Partial<AnchorageConfig['anchorLayout']>) => {
      if (!calc) return;
      const updated = {
        ...calc,
        anchorageConfig: {
          ...calc.anchorageConfig,
          anchorLayout: { ...calc.anchorageConfig.anchorLayout, ...layout },
        },
      };
      saveCalculation(updated);
      setCalc(updated);
    },
    [calc]
  );

  const calculate = useCallback(() => {
    if (!calc) return null;
    const results = runCalculation(
      calc.siteParams,
      calc.equipmentProperties,
      calc.anchorageConfig
    );
    if (results) {
      const updated = { ...calc, results, status: 'calculated' as const };
      saveCalculation(updated);
      setCalc(updated);
    }
    return results;
  }, [calc]);

  return {
    calc,
    update,
    updateSiteParams,
    updateEquipment,
    updateAnchorage,
    updateAnchorLayout,
    calculate,
  };
}
