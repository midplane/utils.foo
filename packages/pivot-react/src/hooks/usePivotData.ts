import { useMemo } from 'react'
import { DataRecord, PivotConfig, PivotResult, PivotEngine } from '@utils-foo/pivot-engine'

export function usePivotData(
  records: DataRecord[],
  config: PivotConfig
): PivotResult {
  return useMemo(() => {
    // Skip computation if no values configured
    if (config.values.length === 0) {
      return {
        rowKeys: [],
        colKeys: [],
        cells: new Map(),
        rowTotals: new Map(),
        colTotals: new Map(),
        grandTotal: { values: [], formatted: [] },
        valueConfigs: config.values,
        isEmpty: true,
      }
    }

    const engine = new PivotEngine(records, config)
    return engine.getResult()
  }, [records, config])
}
