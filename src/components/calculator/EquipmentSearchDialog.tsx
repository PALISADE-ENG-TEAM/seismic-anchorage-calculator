import { useState, useMemo } from 'react';
import type { EquipmentSpec } from '@/lib/types.ts';
import { searchEquipment, getAllEquipment } from '@/lib/equipment-db.ts';
import { X, Search, Package } from 'lucide-react';

const CATEGORIES = ['All', 'HVAC', 'Electrical', 'Plumbing', 'Fire Protection', 'Architectural', 'Other'];

export function EquipmentSearchDialog({
  onSelect,
  onClose,
}: {
  onSelect: (equip: EquipmentSpec) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const results = useMemo(() => {
    if (!query.trim() && category === 'All') {
      return getAllEquipment();
    }
    return searchEquipment(query, category === 'All' ? undefined : category);
  }, [query, category]);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-12 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              autoFocus
              placeholder="Search by model, manufacturer, type, or capacity..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {results.length} models
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 px-4 py-2 border-b border-border overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                category === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No equipment found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((equip) => (
                <button
                  key={equip.id}
                  onClick={() => onSelect(equip)}
                  className="w-full text-left p-3 rounded-lg hover:bg-secondary/60 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{equip.model}</span>
                        <span className="text-xs text-muted-foreground">
                          {equip.manufacturer} {equip.series}
                        </span>
                        {equip.isCustom && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-primary/20 text-primary rounded font-medium">
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {equip.type} | {equip.capacity} | {equip.weight_lbs.toLocaleString()} lbs |{' '}
                        {equip.length_in}"L x {equip.width_in}"W x {equip.height_in}"H
                      </p>
                    </div>
                    <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                      Select
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
