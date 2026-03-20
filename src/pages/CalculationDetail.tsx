import { useState } from 'react';
import { useParams } from 'wouter';
import { Shell } from '@/components/layout/Shell.tsx';
import { useCalculationDetail } from '@/hooks/useCalculation.ts';
import { getProjects } from '@/lib/storage.ts';
import { SiteTab } from '@/components/calculator/SiteTab.tsx';
import { PropertiesTab } from '@/components/calculator/PropertiesTab.tsx';
import { AnchorageTab } from '@/components/calculator/AnchorageTab.tsx';
import { ResultsTab } from '@/components/calculator/ResultsTab.tsx';
import { ReportTab } from '@/components/calculator/ReportTab.tsx';
import { MapPin, Package, Anchor, BarChart3, FileText } from 'lucide-react';

type Tab = 'site' | 'properties' | 'anchorage' | 'results' | 'report';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'site', label: 'Site', icon: MapPin },
  { id: 'properties', label: 'Properties', icon: Package },
  { id: 'anchorage', label: 'Anchorage', icon: Anchor },
  { id: 'results', label: 'Results', icon: BarChart3 },
  { id: 'report', label: 'Report', icon: FileText },
];

export function CalculationDetail() {
  const { projectId, calcId } = useParams<{ projectId: string; calcId: string }>();
  const { calc, updateSiteParams, updateEquipment, updateAnchorage, updateAnchorLayout, calculate } =
    useCalculationDetail(calcId!);
  const [activeTab, setActiveTab] = useState<Tab>('site');

  const project = getProjects().find((p) => p.id === projectId);

  if (!calc) {
    return (
      <Shell title="Calculation Not Found" backHref={`/project/${projectId}`}>
        <p className="text-muted-foreground">This calculation doesn't exist.</p>
      </Shell>
    );
  }

  const handleCalculate = () => {
    const results = calculate();
    if (results) {
      setActiveTab('results');
    }
  };

  return (
    <Shell
      title={calc.name}
      subtitle={project?.name}
      backHref={`/project/${projectId}`}
      actions={
        <button
          onClick={handleCalculate}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors no-print"
        >
          CALCULATE
        </button>
      }
    >
      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b border-border no-print">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'site' && (
        <SiteTab params={calc.siteParams} onChange={updateSiteParams} />
      )}
      {activeTab === 'properties' && (
        <PropertiesTab props={calc.equipmentProperties} onChange={updateEquipment} />
      )}
      {activeTab === 'anchorage' && (
        <AnchorageTab
          config={calc.anchorageConfig}
          onChange={updateAnchorage}
          onLayoutChange={updateAnchorLayout}
          equipLength={calc.equipmentProperties.length}
          equipWidth={calc.equipmentProperties.width}
        />
      )}
      {activeTab === 'results' && (
        <ResultsTab
          results={calc.results}
          onCalculate={handleCalculate}
          siteParams={calc.siteParams}
          equipProps={calc.equipmentProperties}
        />
      )}
      {activeTab === 'report' && <ReportTab calc={calc} />}
    </Shell>
  );
}
