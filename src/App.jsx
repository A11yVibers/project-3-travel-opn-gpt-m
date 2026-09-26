import { useId, useState } from 'react'
import tripDaysCsv from '../project-assets/trip_days.csv?raw'
import itineraryCsv from '../project-assets/itinerary.csv?raw'
import expensesCsv from '../project-assets/expenses.csv?raw'

const categories = [
  { key: 'lodging', label: 'Lodging', color: '#54b6a9' },
  { key: 'food', label: 'Food', color: '#ee7755' },
  { key: 'entertainment', label: 'Entertainment', color: '#6c9fdb' },
  { key: 'travel', label: 'Travel', color: '#dfa72e' },
]

function parseCsv(source) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]

    if (char === '"' && quoted && next === '"') {
      field += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(field)
      field = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(field)
      if (row.some((value) => value !== '')) rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }

  const [headers, ...values] = rows
  return values.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])))
}

const tripDays = parseCsv(tripDaysCsv).sort((a, b) => Number(a.day_number) - Number(b.day_number))
const itinerary = parseCsv(itineraryCsv)
const expenses = parseCsv(expensesCsv)

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const longDate = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

function formatDate(date) {
  return longDate.format(new Date(`${date}T00:00:00Z`))
}

function getPoint(angle, radius) {
  const radians = ((angle - 90) * Math.PI) / 180
  return { x: 110 + radius * Math.cos(radians), y: 110 + radius * Math.sin(radians) }
}

function describeArc(startAngle, endAngle) {
  const start = getPoint(endAngle, 74)
  const end = getPoint(startAngle, 74)
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${start.x} ${start.y} A 74 74 0 ${largeArc} 0 ${end.x} ${end.y}`
}

function App() {
  const [selectedDayId, setSelectedDayId] = useState(tripDays[0].day_id)
  const [selectedCategory, setSelectedCategory] = useState('lodging')
  const chartTitleId = useId()

  const selectedDay = tripDays.find((day) => day.day_id === selectedDayId)
  const selectedItinerary = itinerary
    .filter((item) => item.day_id === selectedDayId)
    .sort((a, b) => Number(a.item_order) - Number(b.item_order))

  const totals = Object.fromEntries(
    categories.map(({ key }) => [
      key,
      expenses
        .filter((expense) => expense.category === key)
        .reduce((sum, expense) => sum + Number(expense.amount_usd), 0),
    ]),
  )
  const grandTotal = Object.values(totals).reduce((sum, value) => sum + value, 0)
  const selectedCategoryData = categories.find((category) => category.key === selectedCategory)
  const dailyCategoryTotals = tripDays.map((day) => ({
    ...day,
    amount: expenses
      .filter((expense) => expense.day_id === day.day_id && expense.category === selectedCategory)
      .reduce((sum, expense) => sum + Number(expense.amount_usd), 0),
  }))
  const highestDailyAmount = Math.max(...dailyCategoryTotals.map((day) => day.amount))

  let chartAngle = 0
  const slices = categories.map((category) => {
    const startAngle = chartAngle
    const endAngle = startAngle + (totals[category.key] / grandTotal) * 360
    chartAngle = endAngle
    return { ...category, startAngle, endAngle }
  })

  return (
    <main>
      <header className="hero">
        <div className="hero__eyebrow"><span aria-hidden="true">✦</span> Europe, by rail and road</div>
        <h1>Ten days,<br /><em>ten cities.</em></h1>
        <p className="hero__intro">A visual field journal from London to Rome, following one new skyline, table, and story every day.</p>
        <div className="hero__route" aria-label="Trip route from London to Rome">
          <span>London</span><span aria-hidden="true">→</span><span>Rome</span><b>01–10 JUN 2026</b>
        </div>
      </header>

      <section className="journey section-shell" aria-labelledby="journey-title">
        <div className="section-heading">
          <div>
            <p className="kicker">The journey</p>
            <h2 id="journey-title">A city every day</h2>
          </div>
          <p>Select a stop to open the day’s field notes.</p>
        </div>

        <div className="journey-scroll" aria-label="Chronological journey flowchart">
          <ol className="journey-track">
            {tripDays.map((day) => {
              const isSelected = day.day_id === selectedDayId
              return (
                <li key={day.day_id} className={isSelected ? 'is-selected' : ''}>
                  <button
                    className="day-node"
                    type="button"
                    aria-pressed={isSelected}
                    aria-controls="itinerary-panel"
                    onClick={() => setSelectedDayId(day.day_id)}
                  >
                    <span className="day-node__number">{String(day.day_number).padStart(2, '0')}</span>
                    <span className="day-node__image">
                      <img src={day.landmark_image_url} alt={day.iconic_landmark} />
                    </span>
                    <strong>{day.city}</strong>
                    <small>{formatDate(day.date).replace(', 2026', '')}</small>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>

        <article className="itinerary-card" id="itinerary-panel" aria-live="polite">
          <div className="itinerary-card__title">
            <div>
              <p>Day {String(selectedDay.day_number).padStart(2, '0')} · {selectedDay.country}</p>
              <h3>{selectedDay.city}</h3>
            </div>
            <time dateTime={selectedDay.date}>{formatDate(selectedDay.date)}</time>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Time</th><th>Place</th><th>Activity</th></tr></thead>
              <tbody>
                {selectedItinerary.map((item) => (
                  <tr key={`${item.day_id}-${item.item_order}`}>
                    <td>{item.time}</td>
                    <td>{item.place}</td>
                    <td>{item.activity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="expenses section-shell" aria-labelledby="expenses-title">
        <div className="section-heading section-heading--light">
          <div>
            <p className="kicker">The travel ledger</p>
            <h2 id="expenses-title">Where the money went</h2>
          </div>
          <p>Select a category to compare it across all ten cities.</p>
        </div>

        <div className="expense-layout">
          <div className="donut-panel">
            <div className="donut-wrap">
              <svg viewBox="0 0 220 220" className="donut" role="group" aria-labelledby={chartTitleId}>
                <title id={chartTitleId}>Overall trip spending by category</title>
                {slices.map((slice) => (
                  <path
                    key={slice.key}
                    d={describeArc(slice.startAngle + 1, slice.endAngle - 1)}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={selectedCategory === slice.key ? 42 : 34}
                    className="donut__slice"
                    role="button"
                    tabIndex="0"
                    aria-label={`${slice.label}: ${money.format(totals[slice.key])}`}
                    aria-pressed={selectedCategory === slice.key}
                    onClick={() => setSelectedCategory(slice.key)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedCategory(slice.key)
                      }
                    }}
                  />
                ))}
              </svg>
              <div className="donut-total" aria-hidden="true"><span>Total trip</span><strong>{money.format(grandTotal)}</strong></div>
            </div>

            <div className="legend" aria-label="Expense category totals">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category.key}
                  className={selectedCategory === category.key ? 'legend-item is-selected' : 'legend-item'}
                  aria-pressed={selectedCategory === category.key}
                  onClick={() => setSelectedCategory(category.key)}
                >
                  <span className="legend-item__dot" style={{ backgroundColor: category.color }} aria-hidden="true" />
                  <span>{category.label}</span>
                  <strong>{money.format(totals[category.key])}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="comparison" aria-live="polite">
            <div className="comparison__title">
              <div>
                <p>Daily comparison</p>
                <h3>{selectedCategoryData.label}</h3>
              </div>
              <strong>{money.format(totals[selectedCategory])}<small>trip total</small></strong>
            </div>
            <div className="bars" role="img" aria-label={`${selectedCategoryData.label} spending by city`}>
              {dailyCategoryTotals.map((day) => (
                <div className="bar-row" key={day.day_id}>
                  <span className="bar-row__day">{String(day.day_number).padStart(2, '0')}</span>
                  <span className="bar-row__city">{day.city}</span>
                  <span className="bar-row__track">
                    <span
                      className="bar-row__fill"
                      style={{ width: `${(day.amount / highestDailyAmount) * 100}%`, backgroundColor: selectedCategoryData.color }}
                    />
                  </span>
                  <strong>{money.format(day.amount)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
