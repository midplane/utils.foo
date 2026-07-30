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

/** Series chips carry a settings button, so match the toggle specifically. */
const chip = (name: RegExp) =>
  screen.getAllByRole('button', { name }).find((el) => el.hasAttribute('aria-pressed'))!

const chart = () => screen.queryByTestId('chart')
const seriesOf = () => chart()?.getAttribute('data-series')
const colorsOf = () => chart()!.getAttribute('data-colors')!.split(',')

describe('chart builder interaction', () => {
  it('survives toggling a series without touching the X axis', async () => {
    const user = await setup()
    expect(seriesOf()).toBe('Revenue,Expenses,Profit')

    await user.click(chip(/Profit/))

    // Previously the chart unmounted entirely at this point.
    expect(chart()).not.toBeNull()
    expect(seriesOf()).toBe('Revenue,Expenses')
    expect((screen.getByLabelText('X axis column') as HTMLSelectElement).value).toBe('Month')
  })

  it('keeps each series on its own colour when another is deselected', async () => {
    const user = await setup()
    const [, expensesColor, profitColor] = colorsOf()

    await user.click(chip(/Revenue/))

    // Colours used to shift left, so chips and chart disagreed.
    expect(colorsOf()).toEqual([expensesColor, profitColor])
  })

  it('treats toggling a series off and back on as a no-op', async () => {
    const user = await setup()
    const before = { series: seriesOf(), colors: colorsOf() }

    await user.click(chip(/Revenue/))
    await user.click(chip(/Revenue/))

    // Re-enabling used to append, permanently reordering series and colours.
    expect(seriesOf()).toBe(before.series)
    expect(colorsOf()).toEqual(before.colors)
  })

  it('exposes series chips as toggle buttons', async () => {
    const user = await setup()
    const profit = chip(/Profit/)
    expect(profit.getAttribute('aria-pressed')).toBe('true')
    await user.click(profit)
    expect(chip(/Profit/).getAttribute('aria-pressed')).toBe('false')
  })

  it('resets stale selections when a different dataset is loaded', async () => {
    const user = await setup()
    await user.click(chip(/Profit/))
    expect(seriesOf()).toBe('Revenue,Expenses')

    // Replacing the data outright: the previous selection names columns that
    // no longer exist and must not survive. The editor collapses once data
    // parses, so it has to be reopened first.
    await user.click(screen.getByRole('button', { name: /Change data/ }))
    await user.clear(screen.getByLabelText('Data'))
    await user.click(screen.getByLabelText('Data'))
    await user.paste('Country,Population\nIndia,1429\nChina,1412')
    expect(seriesOf()).toBe('Population')
  })

  it('draws a dot plot when scatter X is categorical', async () => {
    const user = await setup()
    await user.click(screen.getByRole('button', { name: 'Scatter' }))
    // A categorical X is a valid dot plot, not an error.
    expect(chart()).not.toBeNull()
    expect(seriesOf()).toBe('Revenue,Expenses,Profit')
  })

  it('explains why nothing is drawn when no series remain', async () => {
    const user = await setup()
    for (const name of [/Revenue/, /Expenses/, /Profit/]) {
      await user.click(chip(name))
    }
    expect(chart()).toBeNull()
    expect(screen.getByText(/Select at least one series/)).toBeDefined()
  })
})
