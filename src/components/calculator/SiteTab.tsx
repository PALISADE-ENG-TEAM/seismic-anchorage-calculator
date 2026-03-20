import { useState } from 'react';
import type { SiteParams, RiskCategory, SiteClass } from '@/lib/types.ts';
import { SFRS_TYPES, IMPORTANCE_FACTORS } from '@/lib/constants.ts';
import { fetchSeismicData, geocodeAddress, determineSDC } from '@/lib/usgs-api.ts';
import { BuildingDiagram } from '@/components/diagrams/BuildingDiagram.tsx';
import { MapPin, Search, AlertTriangle } from 'lucide-react';

const SITE_CLASSES: SiteClass[] = ['A', 'B', 'BC', 'C', 'CD', 'D', 'DE', 'E', 'F'];
const RISK_CATEGORIES: RiskCategory[] = ['I', 'II', 'III', 'IV'];

export function SiteTab({
  params,
  onChange,
}: {
  params: SiteParams;
  onChange: (updates: Partial<SiteParams>) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async () => {
    if (!params.address.trim()) {
      setError('Enter an address first');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const geo = await geocodeAddress(params.address);
      const seismic = await fetchSeismicData(
        geo.latitude,
        geo.longitude,
        params.riskCategory,
        params.siteClass
      );
      const sdc = determineSDC(seismic.SDS, seismic.SD1, params.riskCategory);
      onChange({
        latitude: geo.latitude,
        longitude: geo.longitude,
        address: geo.formattedAddress || params.address,
        SDS: seismic.SDS,
        SD1: seismic.SD1,
        Ss: seismic.Ss,
        S1: seismic.S1,
        seismicDesignCategory: sdc,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSFRSChange = (sfrsName: string) => {
    const sfrs = SFRS_TYPES.find((s) => s.name === sfrsName);
    if (sfrs) {
      onChange({
        sfrsType: sfrs.name,
        R_building: sfrs.R,
        Omega0_building: sfrs.Omega0,
      });
    }
  };

  const handleRiskCategoryChange = (rc: RiskCategory) => {
    onChange({
      riskCategory: rc,
      Ip: IMPORTANCE_FACTORS[rc],
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Inputs */}
      <div className="space-y-6">
        {/* Address Lookup */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Location
          </legend>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                placeholder="Enter address (e.g., 123 Main St, Los Angeles, CA)"
                value={params.address}
                onChange={(e) => onChange({ address: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={handleLookup}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Looking up...' : 'Lookup'}
            </button>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}
          {params.latitude !== 0 && (
            <p className="text-xs text-muted-foreground font-mono">
              Lat: {params.latitude.toFixed(4)}, Lon: {params.longitude.toFixed(4)}
            </p>
          )}
        </fieldset>

        {/* Seismic Parameters */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Seismic Parameters
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="SDS (g)" value={params.SDS} onChange={(v) => onChange({ SDS: v })} step={0.01} />
            <NumField label="SD1 (g)" value={params.SD1} onChange={(v) => onChange({ SD1: v })} step={0.01} />
            <NumField label="Ss (g)" value={params.Ss} onChange={(v) => onChange({ Ss: v })} step={0.01} />
            <NumField label="S1 (g)" value={params.S1} onChange={(v) => onChange({ S1: v })} step={0.01} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Site Class"
              value={params.siteClass}
              options={SITE_CLASSES.map((c) => ({ value: c, label: c }))}
              onChange={(v) => onChange({ siteClass: v as SiteClass })}
            />
            <SelectField
              label="Risk Category"
              value={params.riskCategory}
              options={RISK_CATEGORIES.map((c) => ({ value: c, label: `RC ${c}` }))}
              onChange={(v) => handleRiskCategoryChange(v as RiskCategory)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Importance Factor (Ip):</span>{' '}
              <span className="font-mono font-medium">{params.Ip}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">SDC:</span>{' '}
              <span className="font-mono font-medium">{params.seismicDesignCategory || '—'}</span>
            </div>
          </div>
        </fieldset>

        {/* Building Info */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Building Information
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <NumField
              label="Building Height, h (ft)"
              value={params.buildingHeight}
              onChange={(v) => onChange({ buildingHeight: v })}
            />
            <NumField
              label="Attachment Height, z (ft)"
              value={params.attachmentHeight}
              onChange={(v) => onChange({ attachmentHeight: v })}
            />
          </div>
          {params.buildingHeight > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground">z/h ratio:</span>{' '}
              <span className="font-mono font-medium">
                {(params.attachmentHeight / params.buildingHeight).toFixed(3)}
              </span>
            </div>
          )}
        </fieldset>

        {/* SFRS Type (for Rμ) */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Building SFRS (for R&#956; calculation)
          </legend>
          <SelectField
            label="Structural System"
            value={params.sfrsType}
            options={SFRS_TYPES.map((s) => ({ value: s.name, label: s.name }))}
            onChange={handleSFRSChange}
          />
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">R = </span>
              <span className="font-mono">{params.R_building}</span>
            </div>
            <div>
              <span className="text-muted-foreground">&Omega;&#8320; = </span>
              <span className="font-mono">{params.Omega0_building}</span>
            </div>
            <div>
              <span className="text-muted-foreground">I&#7497; = </span>
              <span className="font-mono">{params.Ie_building}</span>
            </div>
          </div>
          <NumField
            label="Approx. Period Ta (s) — leave 0 if unknown"
            value={params.Ta_approx ?? 0}
            onChange={(v) => onChange({ Ta_approx: v > 0 ? v : null })}
            step={0.01}
          />
        </fieldset>
      </div>

      {/* Right: Building Diagram */}
      <div className="flex flex-col items-center">
        <BuildingDiagram
          h={params.buildingHeight}
          z={params.attachmentHeight}
        />
      </div>
    </div>
  );
}

// --- Reusable Field Components ---

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

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
