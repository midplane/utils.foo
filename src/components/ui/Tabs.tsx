import { useState, ReactNode, createContext, useContext, useId } from 'react'
import { cn } from '../../lib/utils'
import { SEGMENTED_GROUP_CLASS, segmentedItemClass } from './SegmentedControl'

// Tabs and SegmentedControl share a visual language on purpose and import it
// from one place. They stay separate components because they mean different
// things: Tabs swaps panels and carries tablist/tab/tabpanel semantics, while
// SegmentedControl sets a value and is a group of toggle buttons.

interface TabsContextType {
  activeTab: string
  setActiveTab: (value: string) => void
  baseId: string
}

const TabsContext = createContext<TabsContextType | null>(null)

interface TabsProps {
  defaultValue: string
  children: ReactNode
  className?: string
}

export function Tabs({ defaultValue, children, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue)
  const baseId = useId()

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: ReactNode
  className?: string
  /** Accessible name for the tab list, e.g. "Report sections". */
  label?: string
}

export function TabsList({ children, className, label }: TabsListProps) {
  return (
    <div role="tablist" aria-label={label} className={cn(SEGMENTED_GROUP_CLASS, 'w-fit', className)}>
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: ReactNode
  className?: string
}

export function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsTrigger must be used within Tabs')
  
  const { activeTab, setActiveTab, baseId } = context
  const isActive = activeTab === value

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={isActive}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={isActive ? 0 : -1}
      onClick={() => setActiveTab(value)}
      className={cn(segmentedItemClass(isActive), className)}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: ReactNode
  className?: string
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabsContent must be used within Tabs')
  
  const { activeTab, baseId } = context
  if (activeTab !== value) return null

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={cn('mt-3', className)}
    >
      {children}
    </div>
  )
}
