import { useState, useCallback, useMemo } from 'react';
import type { SiteParams, RiskCategory, SiteClass, SeismicApproach } from '@/lib/types.ts';
import { SFRS_TYPES_KNOWN, IMPORTANCE_FACTORS } from '@/lib/constants.ts';
import { fetchSeismicData, geocodeAddress, determineSDC } from '@/lib/usgs-api.ts';
import { checkSDCExemption } from '@/lib/calculations.ts';
import { BuildingDiagram } from '@/components/diagrams/BuildingDiagram.tsx';
import { AddressAutocomplete } from '@/components/calculator/AddressAutocomplete.tsx';
import type { AddressSuggestion } from '@/components/calculator/AddressAutocomplete.tsx';
import { Search, AlertTriangle, Info, CheckCircle2, ShieldAlert } from 'lucide-react';

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

  // Shared USGS lookup logic — accepts explicit lat/lon or geocodes from address
  const runUSGSLookup = useCallback(
    async (lat?: number, lon?: number, addressText?: string) => {
      setLoading(true);
      setError('');
      try {
        let latitude = lat;
        let longitude = lon;
        let resolvedAddress = addressText ?? params.address;

        // If no lat/lon provided, geocode the address first
        if (latitude === undefined || longitude === undefined) {
          if (!params.address.trim()) {
            setError('Enter an address first');
            setLoading(false);
            return;
          }
          const geo = await geocodeAddress(params.address);
          latitude = geo.latitude;
          longitude = geo.longitude;
          resolvedAddress = geo.formattedAddress || params.address;
        }

        const seismic = await fetchSeismicData(
          latitude,
          longitude,
          params.riskCategory,
          params.siteClass
        );
        const sdc = determineSDC(seismic.SDS, seismic.SD1, params.riskCategory);
        onChange({
          latitude,
          longitude,
          address: resolvedAddress,
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
    },
    [params.address, params.riskCategory, params.siteClass, onChange]
  );

  const handleLookup = () => runUSGSLookup();

  const handleAutocompleteSelect = useCallback(
    (result: AddressSuggestion) => {
      const parts = [result.street, result.city, result.state, result.zipCode].filter(Boolean);
      const addressText = parts.length > 0 ? parts.join(', ') : result.displayName;
      // Auto-trigger USGS lookup with the lat/lon from the selected suggestion
      runUSGSLookup(result.latitude, result.longitude, addressText);
    },
    [runUSGSLookup]
  );

  const handleSFRSChange = (sfrsName: string) => {
    const sfrs = SFRS_TYPES_KNOWN.find((s) => s.name === sfrsName);
    if (sfrs) {
      onChange({
        sfrsType: sfrs.name,
        R_building: sfrs.R,
        Omega0_building: sfrs.Omega0,
      });
    }
  };

  const handleRiskCategoryChange = (rc: RiskCategory) => {
    const Ie = IMPORTANCE_FACTORS[rc];
    onChange({
      riskCategory: rc,
      Ip: Ie,
      Ie_building: Ie,
    });
  };

  const handleApproachChange = (approach: SeismicApproach) => {
    const updates: Partial<SiteParams> = { seismicApproach: approach };
    if (approach === 'general') {
      updates.sfrsType = 'Unknown / Not specified';
      updates.R_building = 0;
      updates.Omega0_building = 0;
      updates.Ta_approx = null;
      updates.Ai_override = null;
    } else if (approach === 'known-sfrs') {
      updates.Ai_override = null;
      // If switching to known-sfrs and no SFRS selected yet, pick first one
      if (!params.sfrsType || params.sfrsType === 'Unknown / Not specified') {
        const first = SFRS_TYPES_KNOWN[0];
        if (first) {
          updates.sfrsType = first.name;
          updates.R_building = first.R;
          updates.Omega0_building = first.Omega0;
        }
      }
    } else if (approach === 'floor-accel') {
      // Keep SFRS values but they won't be used
    }
    onChange(updates);
  };

  // SDC exemption check (memoized)
  const sdcExemption = useMemo(() => {
    if (!params.seismicDesignCategory) return null;
    // Use 'mechanical' as default category — will be refined when component is selected
    return checkSDCExemption(
      params.seismicDesignCategory,
      params.Ip,
      params.attachmentHeight,
      params.buildingHeight,
      0, // weight not known yet on SiteTab
      'mechanical'
    );
  }, [params.seismicDesignCategory, params.Ip, params.attachmentHeight, params.buildingHeight]);

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
            <AddressAutocomplete
              value={params.address}
              onChange={(address) => onChange({ address })}
              onSelect={handleAutocompleteSelect}
            />
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
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Ip:</span>{' '}
              <span className="font-mono font-medium">{params.Ip}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Ie:</span>{' '}
              <span className="font-mono font-medium">{params.Ie_building}</span>
            </div>
            <div>
              <span className="text-muted-foreground">SDC:</span>{' '}
              <span className="font-mono font-medium">{params.seismicDesignCategory || '—'}</span>
            </div>
          </div>
          {/* SDC Exemption Badge */}
          {sdcExemption && (
            <div className={`flex items-start gap-2 text-sm px-3 py-2 rounded-lg ${
              sdcExemption.status === 'exempt'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : params.seismicDesignCategory && ['D', 'E', 'F'].includes(params.seismicDesignCategory)
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {sdcExemption.status === 'exempt' ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              <div>
                <span className="font-medium">{sdcExemption.status === 'exempt' ? 'EXEMPT' : 'REQUIRED'}</span>
                {' — '}{sdcExemption.reason}
                <span className="text-xs block mt-0.5 opacity-75">{sdcExemption.codeRef}</span>
              </div>
            </div>
          )}
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

        {/* Seismic System Approach */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Seismic System (ASCE 7-22 &#167;13.3.1)
          </legend>

          {/* Radio group: 3 approaches */}
          <div className="space-y-2">
            <RadioOption
              name="seismicApproach"
              value="general"
              checked={(params.seismicApproach ?? 'general') === 'general'}
              onChange={() => handleApproachChange('general')}
              label="General Case"
              description="Building structure unknown"
            />
            <RadioOption
              name="seismicApproach"
              value="known-sfrs"
              checked={params.seismicApproach === 'known-sfrs'}
              onChange={() => handleApproachChange('known-sfrs')}
              label="Known SFRS"
              description="Building structural system is known"
            />
            <RadioOption
              name="seismicApproach"
              value="floor-accel"
              checked={params.seismicApproach === 'floor-accel'}
              onChange={() => handleApproachChange('floor-accel')}
              label="Floor Acceleration"
              description="From structural analysis"
            />
          </div>

          {/* General case info */}
          {(params.seismicApproach ?? 'general') === 'general' && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Conservative defaults: Hf per Eq. 13.3-5 (no period needed), R&#956; = 1.3</span>
            </div>
          )}

          {/* Known SFRS expanded inputs */}
          {params.seismicApproach === 'known-sfrs' && (
            <div className="space-y-3 pl-6 border-l-2 border-primary/20">
              <SelectField
                label="Structural System (Table 12.2-1)"
                value={params.sfrsType === 'Unknown / Not specified' ? SFRS_TYPES_KNOWN[0]?.name ?? '' : params.sfrsType}
                options={SFRS_TYPES_KNOWN.map((s) => ({ value: s.name, label: s.name }))}
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
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>R&#956; per Eq. 13.3-6. If period provided, Hf uses Eq. 13.3-4; otherwise Eq. 13.3-5.</span>
              </div>
            </div>
          )}

          {/* Floor acceleration expanded input */}
          {params.seismicApproach === 'floor-accel' && (
            <div className="space-y-3 pl-6 border-l-2 border-primary/20">
              <NumField
                label="Floor acceleration at equipment level, Ai (g)"
                value={params.Ai_override ?? 0}
                onChange={(v) => onChange({ Ai_override: v > 0 ? v : null })}
                step={0.01}
              />
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Per &#167;13.3.1.1: Fp = Ai &times; (CAR/Rpo) &times; Ip &times; Wp, bounded by Fp,min and Fp,max.</span>
              </div>
            </div>
          )}
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

function RadioOption({
  name,
  value,
  checked,
  onChange,
  label,
  description,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  description: string;
}) {
  return (
    <label className={`flex items-start gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
      checked
        ? 'border-primary bg-primary/5'
        : 'border-border hover:border-primary/40'
    }`}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-1"
      />
      <div>
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground block">{description}</span>
      </div>
    </label>
  );
}
