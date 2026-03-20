import { useState } from 'react';
import type { EquipmentProperties } from '@/lib/types.ts';
import { COMPONENT_TYPES } from '@/lib/constants.ts';
import { EquipmentSearchDialog } from '@/components/calculator/EquipmentSearchDialog.tsx';
import { EquipmentDiagram } from '@/components/diagrams/EquipmentDiagram.tsx';
import { Search } from 'lucide-react';

export function PropertiesTab({
  props,
  onChange,
}: {
  props: EquipmentProperties;
  onChange: (updates: Partial<EquipmentProperties>) => void;
}) {
  const [showSearch, setShowSearch] = useState(false);

  const handleComponentTypeChange = (name: string) => {
    const ct = COMPONENT_TYPES.find((c) => c.name === name);
    if (ct) {
      onChange({
        componentType: ct.name,
        CAR_atGrade: ct.CAR_atGrade,
        CAR_aboveGrade: ct.CAR_aboveGrade,
        Rpo: ct.Rpo,
        Omega0p: ct.Omega0p,
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Inputs */}
      <div className="space-y-6">
        {/* Equipment Search */}
        <div>
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Search className="w-4 h-4" />
            Search Equipment Database
          </button>
        </div>

        {showSearch && (
          <EquipmentSearchDialog
            onSelect={(equip) => {
              onChange({
                manufacturer: equip.manufacturer,
                modelNumber: equip.model,
                equipmentType: equip.type,
                componentType: equip.componentType,
                weight: equip.weight_lbs,
                length: equip.length_in,
                width: equip.width_in,
                height: equip.height_in,
                cgHeight: equip.cg_height_in,
                CAR_atGrade: equip.CAR_atGrade,
                CAR_aboveGrade: equip.CAR_aboveGrade,
                Rpo: equip.Rpo,
                Omega0p: equip.Omega0p,
              });
              setShowSearch(false);
            }}
            onClose={() => setShowSearch(false)}
          />
        )}

        {/* Equipment Info */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Equipment Information
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-muted-foreground">Manufacturer</span>
              <input
                value={props.manufacturer}
                onChange={(e) => onChange({ manufacturer: e.target.value })}
                className="mt-1 w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Model Number</span>
              <input
                value={props.modelNumber}
                onChange={(e) => onChange({ modelNumber: e.target.value })}
                className="mt-1 w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs text-muted-foreground">Equipment Type</span>
            <input
              value={props.equipmentType}
              onChange={(e) => onChange({ equipmentType: e.target.value })}
              className="mt-1 w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        </fieldset>

        {/* Component Type & Seismic Parameters */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            ASCE 7-22 Component Parameters
          </legend>
          <label className="block">
            <span className="text-xs text-muted-foreground">Component Type (Tables 13.5-1 / 13.6-1)</span>
            <select
              value={props.componentType}
              onChange={(e) => handleComponentTypeChange(e.target.value)}
              className="mt-1 w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {COMPONENT_TYPES.map((ct) => (
                <option key={ct.name} value={ct.name}>
                  {ct.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-4 gap-3">
            <NumField label="CAR (at grade)" value={props.CAR_atGrade} onChange={(v) => onChange({ CAR_atGrade: v })} step={0.1} />
            <NumField label="CAR (above)" value={props.CAR_aboveGrade} onChange={(v) => onChange({ CAR_aboveGrade: v })} step={0.1} />
            <NumField label="Rpo" value={props.Rpo} onChange={(v) => onChange({ Rpo: v })} step={0.1} />
            <NumField label="\u03A90p" value={props.Omega0p} onChange={(v) => onChange({ Omega0p: v })} step={0.05} />
          </div>
        </fieldset>

        {/* Physical Properties */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Physical Properties
          </legend>
          <NumField label="Weight, Wp (lbs)" value={props.weight} onChange={(v) => onChange({ weight: v })} />
          <div className="grid grid-cols-3 gap-3">
            <NumField label="Length, L (in)" value={props.length} onChange={(v) => onChange({ length: v })} />
            <NumField label="Width, W (in)" value={props.width} onChange={(v) => onChange({ width: v })} />
            <NumField label="Height, H (in)" value={props.height} onChange={(v) => onChange({ height: v })} />
          </div>
          <NumField label="CG Height, hcg (in)" value={props.cgHeight} onChange={(v) => onChange({ cgHeight: v })} />
        </fieldset>
      </div>

      {/* Right: Equipment Diagram */}
      <div className="flex flex-col items-center">
        <EquipmentDiagram
          length={props.length}
          width={props.width}
          height={props.height}
          cgHeight={props.cgHeight}
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
