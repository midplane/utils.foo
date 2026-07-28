import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Stub ECharts: assertions are about what the component asks it to draw.
vi.mock('echarts-for-react', () => ({
  default: (props: { option: { series?: { name: string; itemStyle?: { color?: string } }[] } }) => (
    <div
      data-testid="chart"
      data-series={(props.option.series ?? []).map((s) => s.name).join(',')}
      data-colors={(props.option.series ?? []).map((s) => s.itemStyle?.color ?? '').join(',')}
    />
  ),
}))

vi.mock('../contexts/ThemeContext', () => ({ useTheme: () => ({ isDark: false, toggle: () => {} }) }))

const { default: ChartBuilder } = await import('../tools/chart-builder/index')

const CSV = `Month,Revenue,Expenses,Profit
Jan,42000,31000,11000
Feb,38000,29000,9000`

async function setup() {
  const user = userEvent.setup()
  render(<ChartBuilder />)
  await user.click(screen.getByLabelText('Data'))
  await user.paste(CSV)
  return user
}

const chart = () => screen.queryByTestId('chart')
const seriesOf = () => chart()?.getAttribute('data-series')
const colorsOf = () => chart()!.getAttribute('data-colors')!.split(',')

describe('chart builder interaction', () => {
  it('survives toggling a series without touching the X axis', async () => {
    const user = await setup()
    expect(seriesOf()).toBe('Revenue,Expenses,Profit')

    await user.click(screen.getByRole('button', { name: /Profit/ }))

    // Previously the chart unmounted entirely at this point.
    expect(chart()).not.toBeNull()
    expect(seriesOf()).toBe('Revenue,Expenses')
    expect((screen.getByLabelText('X Axis') as HTMLSelectElement).value).toBe('Month')
  })

  it('keeps each series on its own colour when another is deselected', async () => {
    const user = await setup()
    const [, expensesColor, profitColor] = colorsOf()

    await user.click(screen.getByRole('button', { name: /Revenue/ }))

    // Colours used to shift left, so chips and chart disagreed.
    expect(colorsOf()).toEqual([expensesColor, profitColor])
  })

  it('treats toggling a series off and back on as a no-op', async () => {
    const user = await setup()
    const before = { series: seriesOf(), colors: colorsOf() }

    await user.click(screen.getByRole('button', { name: /Revenue/ }))
    await user.click(screen.getByRole('button', { name: /Revenue/ }))

    // Re-enabling used to append, permanently reordering series and colours.
    expect(seriesOf()).toBe(before.series)
    expect(colorsOf()).toEqual(before.colors)
  })

  it('exposes series chips as toggle buttons', async () => {
    const user = await setup()
    const chip = screen.getByRole('button', { name: /Profit/ })
    expect(chip.getAttribute('aria-pressed')).toBe('true')
    await user.click(chip)
    expect(chip.getAttribute('aria-pressed')).toBe('false')
  })

  it('resets stale selections when a different dataset is loaded', async () => {
    const user = await setup()
    await user.click(screen.getByRole('button', { name: /Profit/ }))
    expect(seriesOf()).toBe('Revenue,Expenses')

    await user.selectOptions(
      screen.getByLabelText('Load sample data'),
      'Population (single-series)'
    )
    expect(seriesOf()).toBe('Population (millions)')
  })

  it('warns instead of silently collapsing points when scatter X is not numeric', async () => {
    const user = await setup()
    await user.click(screen.getByRole('button', { name: 'scatter' }))
    expect(screen.getByText(/cannot position points/)).toBeDefined()
  })
})
