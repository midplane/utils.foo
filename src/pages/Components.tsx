import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Code,
  Grid2x2,
  Info,
  LayoutList,
  LockKeyhole,
  Table2,
} from 'lucide-react'
import {
  Button,
  Input,
  Textarea,
  Select,
  Checkbox,
  Radio,
  Toggle,
  SegmentedControl,
  SegmentedControlItem,
  Card,
  CardHeader,
  CardContent,
  Badge,
  Alert,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Modal,
  Tooltip,
  Divider,
  Skeleton,
  Spinner,
  Kbd,
  CopyButton,
  ToolHeader,
  FlowDivider,
  SectionLabel,
  SearchInput,
  EmptyState,
  ResultBox,
  InfoCard,
  useExpandable,
  ExpandableCard,
  ExpandableCardHeader,
  ExpandableCardContent,
  ExpandToggleButton,
  ExpandHint,
} from '../components/ui'

export function Components() {
  const [modalOpen, setModalOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [selectValue, setSelectValue] = useState('option1')
  const [checked, setChecked] = useState(false)
  const [radioValue, setRadioValue] = useState('radio1')
  const [toggleValue, setToggleValue] = useState(false)
  const [segmentedValue, setSegmentedValue] = useState('encode')
  const [viewMode, setViewMode] = useState('grid')
  const [accentValue, setAccentValue] = useState('edit')
  const [borderedValue, setBorderedValue] = useState('bar')
  const [inkValue, setInkValue] = useState('16:9')
  const [searchValue, setSearchValue] = useState('')
  const expandable = useExpandable()

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-1">
        <Link 
          to="/" 
          className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="font-mono text-xl font-semibold text-[var(--color-ink)]">
            Component <span className="text-[var(--color-accent)]">Library</span>
          </h1>
          <Badge variant="accent">Kitchen Sink</Badge>
        </div>
        <p className="text-xs text-[var(--color-ink-muted)]">
          All UI components with the utils.foo theme
        </p>
      </div>

      <Divider label="Tool Components" />

      {/* ToolHeader */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">ToolHeader</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">Basic</p>
            <ToolHeader icon={<LockKeyhole />} title="JWT Decoder" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">With Accented Suffix</p>
            <ToolHeader icon={<Code />} title="JSON" accentedSuffix="Formatter" />
          </div>
        </CardContent>
      </Card>

      {/* FlowDivider */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">FlowDivider</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">Default (No Output)</p>
            <FlowDivider />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">With Output (Success State)</p>
            <FlowDivider hasOutput />
          </div>
        </CardContent>
      </Card>

      {/* SectionLabel */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">SectionLabel</span>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <SectionLabel>Input Options</SectionLabel>
            <SectionLabel htmlFor="demo-section-input">With htmlFor attribute</SectionLabel>
          </div>
        </CardContent>
      </Card>

      {/* SearchInput */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">SearchInput</span>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <SearchInput
              value={searchValue}
              onChange={setSearchValue}
              placeholder="Search components..."
            />
          </div>
        </CardContent>
      </Card>

      {/* EmptyState */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">EmptyState</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">Default Size</p>
            <div className="border border-[var(--color-border)] rounded-lg">
              <EmptyState message="No items found" />
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">With Query</p>
            <div className="border border-[var(--color-border)] rounded-lg">
              <EmptyState query="foobar" />
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">Small Size</p>
            <div className="border border-[var(--color-border)] rounded-lg">
              <EmptyState size="sm" message="No matching records" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ResultBox */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">ResultBox</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">Empty State</p>
            <ResultBox label="Output" isEmpty>{null}</ResultBox>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">With Content</p>
            <ResultBox label="Result">
              <code className="text-xs font-mono text-[var(--color-success-text)]">
                {"{ \"success\": true, \"count\": 42 }"}
              </code>
            </ResultBox>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">With Copy Button</p>
            <ResultBox label="Hash Output" copyText="a1b2c3d4e5f6...">
              <code className="text-xs font-mono text-[var(--color-success-text)]">
                a1b2c3d4e5f6...
              </code>
            </ResultBox>
          </div>
        </CardContent>
      </Card>

      {/* InfoCard */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">InfoCard</span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoCard
              icon={<Info className="text-[var(--color-accent)]" />}
              title="Helpful Tip"
              description="Use InfoCard to display contextual information or tips to users."
            />
            <InfoCard
              icon={<LockKeyhole className="text-[var(--color-success-icon)]" />}
              title="Secure Connection"
              description="All data is encrypted and processed locally in your browser."
            />
          </div>
        </CardContent>
      </Card>

      {/* ExpandableCard */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">ExpandableCard</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-[var(--color-ink-muted)]">
            A card that can expand to fill the viewport with backdrop blur. 
            Uses <code className="bg-[var(--color-cream-dark)] px-1 rounded">useExpandable()</code> hook for state management.
          </p>
          <ExpandableCard 
            expanded={expandable.expanded} 
            onExpandedChange={expandable.setExpanded}
          >
            <ExpandableCardHeader className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-ink)]">Expandable Content</span>
              <ExpandToggleButton />
            </ExpandableCardHeader>
            <ExpandableCardContent>
              <div className="space-y-3">
                <p className="text-sm text-[var(--color-ink-muted)]">
                  Click the expand button to see this card fill the viewport.
                </p>
                <div className="flex items-center gap-3">
                  <Badge variant="accent">Feature</Badge>
                  <span className="text-xs text-[var(--color-ink-muted)]">Backdrop blur overlay</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="accent">Feature</Badge>
                  <span className="text-xs text-[var(--color-ink-muted)]">Escape key to collapse</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="accent">Feature</Badge>
                  <span className="text-xs text-[var(--color-ink-muted)]">Click outside to collapse</span>
                </div>
                <ExpandHint />
              </div>
            </ExpandableCardContent>
          </ExpandableCard>
        </CardContent>
      </Card>

      <Divider label="Buttons" />

      {/* Buttons */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">Button</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">Variants</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="primary" disabled>Disabled</Button>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">Sizes</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">With Icon</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" className="gap-1.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Item
              </Button>
              <Button variant="secondary" className="gap-1.5">
                <Spinner size="sm" />
                Loading
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Divider label="Form Inputs" />

      {/* Inputs */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">Input &amp; Textarea</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Text Input" 
              placeholder="Enter text..." 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              id="demo-input"
            />
            <Input 
              label="Disabled Input" 
              placeholder="Can't edit this" 
              disabled
              id="demo-input-disabled"
            />
          </div>
          <Textarea 
            label="Textarea" 
            placeholder="Enter longer text..."
            rows={3}
            id="demo-textarea"
          />
        </CardContent>
      </Card>

      {/* Select */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">Select</span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Choose an option"
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
              options={[
                { value: 'option1', label: 'Option 1' },
                { value: 'option2', label: 'Option 2' },
                { value: 'option3', label: 'Option 3' },
              ]}
              id="demo-select"
            />
            <Select
              label="Disabled Select"
              disabled
              options={[{ value: 'disabled', label: 'Cannot change' }]}
              id="demo-select-disabled"
            />
          </div>
        </CardContent>
      </Card>

      {/* Segmented Control */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">Segmented Control</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">Pill (Default)</p>
            <SegmentedControl value={segmentedValue} onChange={setSegmentedValue} variant="pill">
              <SegmentedControlItem value="encode">Encode</SegmentedControlItem>
              <SegmentedControlItem value="decode">Decode</SegmentedControlItem>
            </SegmentedControl>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">Pill with Icons</p>
            <SegmentedControl value={viewMode} onChange={setViewMode} variant="pill">
              <SegmentedControlItem value="grid" className="gap-1.5">
                <Grid2x2 className="w-3 h-3" />
                Grid
              </SegmentedControlItem>
              <SegmentedControlItem value="list" className="gap-1.5">
                <LayoutList className="w-3 h-3" />
                List
              </SegmentedControlItem>
              <SegmentedControlItem value="table" className="gap-1.5">
                <Table2 className="w-3 h-3" />
                Table
              </SegmentedControlItem>
            </SegmentedControl>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">Accent</p>
            <SegmentedControl value={accentValue} onChange={setAccentValue} variant="accent">
              <SegmentedControlItem value="edit">
                <Code className="w-3 h-3" />
              </SegmentedControlItem>
              <SegmentedControlItem value="preview">Preview</SegmentedControlItem>
              <SegmentedControlItem value="split">Split</SegmentedControlItem>
            </SegmentedControl>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">Bordered</p>
            <SegmentedControl value={borderedValue} onChange={setBorderedValue} variant="bordered">
              <SegmentedControlItem value="bar">Bar</SegmentedControlItem>
              <SegmentedControlItem value="line">Line</SegmentedControlItem>
              <SegmentedControlItem value="pie">Pie</SegmentedControlItem>
              <SegmentedControlItem value="scatter">Scatter</SegmentedControlItem>
            </SegmentedControl>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">Ink</p>
            <SegmentedControl value={inkValue} onChange={setInkValue} variant="ink">
              <SegmentedControlItem value="1:1">1:1</SegmentedControlItem>
              <SegmentedControlItem value="4:3">4:3</SegmentedControlItem>
              <SegmentedControlItem value="16:9">16:9</SegmentedControlItem>
            </SegmentedControl>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">With Disabled Item</p>
            <SegmentedControl value="active" onChange={() => {}}>
              <SegmentedControlItem value="active">Active</SegmentedControlItem>
              <SegmentedControlItem value="disabled" disabled>Disabled</SegmentedControlItem>
              <SegmentedControlItem value="other">Other</SegmentedControlItem>
            </SegmentedControl>
          </div>
        </CardContent>
      </Card>

      {/* Checkboxes, Radios, Toggles */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">Checkbox, Radio &amp; Toggle</span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">Checkbox</p>
              <div className="space-y-2">
                <Checkbox 
                  label="Accept terms" 
                  checked={checked} 
                  onChange={(e) => setChecked(e.target.checked)}
                  id="demo-checkbox"
                />
                <Checkbox label="Disabled" disabled id="demo-checkbox-disabled" />
                <Checkbox label="Checked disabled" checked disabled id="demo-checkbox-checked-disabled" />
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">Radio</p>
              <div className="space-y-2">
                <Radio 
                  name="demo-radio" 
                  label="Option A" 
                  checked={radioValue === 'radio1'}
                  onChange={() => setRadioValue('radio1')}
                  id="radio1"
                />
                <Radio 
                  name="demo-radio" 
                  label="Option B" 
                  checked={radioValue === 'radio2'}
                  onChange={() => setRadioValue('radio2')}
                  id="radio2"
                />
                <Radio name="demo-radio" label="Disabled" disabled id="radio3" />
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">Toggle</p>
              <div className="space-y-2">
                <Toggle 
                  label="Enable feature" 
                  checked={toggleValue}
                  onChange={(e) => setToggleValue(e.target.checked)}
                  id="demo-toggle"
                />
                <Toggle label="Disabled" disabled id="demo-toggle-disabled" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Divider label="Display" />

      {/* Badges */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">Badge</span>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">Default</Badge>
            <Badge variant="accent">Accent</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">Alert</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">Default Size</p>
            <div className="space-y-2">
              <Alert variant="info">This is an informational message.</Alert>
              <Alert variant="success">Operation completed successfully!</Alert>
              <Alert variant="warning">Please review before continuing.</Alert>
              <Alert variant="error">An error occurred. Please try again.</Alert>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">Small Size</p>
            <div className="space-y-2">
              <Alert variant="info" size="sm">Small info alert</Alert>
              <Alert variant="success" size="sm">Small success alert</Alert>
              <Alert variant="warning" size="sm">Small warning alert</Alert>
              <Alert variant="error" size="sm">Small error alert</Alert>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">Tabs</span>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tab1">
            <TabsList>
              <TabsTrigger value="tab1">Overview</TabsTrigger>
              <TabsTrigger value="tab2">Settings</TabsTrigger>
              <TabsTrigger value="tab3">Advanced</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1">
              <div className="text-sm text-[var(--color-ink-muted)]">
                Overview content goes here. This is the first tab panel.
              </div>
            </TabsContent>
            <TabsContent value="tab2">
              <div className="text-sm text-[var(--color-ink-muted)]">
                Settings content goes here. Configure your preferences.
              </div>
            </TabsContent>
            <TabsContent value="tab3">
              <div className="text-sm text-[var(--color-ink-muted)]">
                Advanced options for power users.
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Divider label="Feedback" />

      {/* Modal */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">Modal</span>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
          <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Modal Title">
            <p className="text-sm text-[var(--color-ink-muted)] mb-4">
              This is a modal dialog. Press Escape or click outside to close.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setModalOpen(false)}>Confirm</Button>
            </div>
          </Modal>
        </CardContent>
      </Card>

      {/* Tooltip */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">Tooltip</span>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Tooltip content="Tooltip on top" position="top">
              <Button variant="secondary">Top</Button>
            </Tooltip>
            <Tooltip content="Tooltip on bottom" position="bottom">
              <Button variant="secondary">Bottom</Button>
            </Tooltip>
            <Tooltip content="Tooltip on left" position="left">
              <Button variant="secondary">Left</Button>
            </Tooltip>
            <Tooltip content="Tooltip on right" position="right">
              <Button variant="secondary">Right</Button>
            </Tooltip>
          </div>
        </CardContent>
      </Card>

      {/* Spinner & Skeleton */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">Loading States</span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">Spinner</p>
              <div className="flex items-center gap-4">
                <Spinner size="sm" />
                <Spinner size="md" />
                <Spinner size="lg" />
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">Skeleton</p>
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Divider label="Utilities" />

      {/* Kbd & CopyButton */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">Utilities</span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">Keyboard Shortcut</p>
              <div className="flex items-center gap-1 text-sm text-[var(--color-ink-muted)]">
                Press <Kbd>⌘</Kbd> + <Kbd>K</Kbd> to search
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">Copy Button</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-[var(--color-cream-dark)] px-2 py-1 rounded border border-[var(--color-border)]">
                  npm install utils.foo
                </code>
                <CopyButton text="npm install utils.foo" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Divider showcase */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">Divider</span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">Simple</p>
            <Divider />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-muted)] mb-2">With Label</p>
            <Divider label="or continue with" />
          </div>
        </CardContent>
      </Card>

      {/* Card showcase */}
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-[var(--color-ink)]">Card</span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent>
                <p className="text-sm text-[var(--color-ink)]">Simple card with content only</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <span className="text-xs font-semibold">With Header</span>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--color-ink-muted)]">Card content here</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
