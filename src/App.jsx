import { useState } from 'react'
import tripDaysCsv from '../project-assets/trip_days.csv?raw'
import itineraryCsv from '../project-assets/itinerary.csv?raw'
import expensesCsv from '../project-assets/expenses.csv?raw'

const categories = [
  { id: 'lodging', label: 'Lodging', color: '#df684b' },
  { id: 'food', label: 'Food', color: '#e9aa3c' },
  { id: 'entertainment', label: 'Entertainment', color: '#4a8b82' },
  { id: 'travel', label: 'Travel', color: '#24475d' },
]

function parseCsv(csv) {
  const rows = []
  let row = []
  let value = ''
  let quoted = false

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index]
    const next = csv[index + 1]

    if (character === '"' && quoted && next === '"') {
      value += '"'
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === ',' && !quoted) {
      row.push(value)
      value = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1
      row.push(value)
      if (row.some(Boolean)) rows.push(row)
      row = []
      value = ''
    } else {
      value += character
    }
  }

  if (value || row.length) {
    row.push(value)
    rows.push(row)
  }

  const [headers, ...records] = rows
  return records.map((record) =>
    Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ''])),
  )
}

const days = parseCsv(tripDaysCsv).sort((a, b) => Number(a.day_number) - Number(b.day_number))
const itinerary = parseCsv(itineraryCsv)
const expenses = parseCsv(expensesCsv)
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

function displayDate(date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(`${date}T12:00:00`),
  )
}

function DonutChart({ totals, grandTotal, selectedCategory, onSelect }) {
  const radius = 68
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="donut-wrap">
      <svg className="donut" viewBox="0 0 184 184" role="group" aria-label="Trip expense distribution">
        <circle className="donut-track" cx="92" cy="92" r={radius} />
        {categories.map((category) => {
          const portion = totals[category.id] / grandTotal
          const dash = portion * circumference
          const currentOffset = offset
          offset += dash
          const selected = selectedCategory === category.id

          return (
            <circle
              key={category.id}
              className={`donut-slice${selected ? ' is-selected' : ''}`}
              cx="92"
              cy="92"
              r={radius}
              pathLength={circumference}
              stroke={category.color}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-currentOffset}
              role="button"
              tabIndex="0"
              aria-label={`${category.label}: ${money.format(totals[category.id])}, ${Math.round(portion * 100)} percent`}
              aria-pressed={selected}
              onClick={() => onSelect(category.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(category.id)
                }
              }}
            />
          )
        })}
      </svg>
      <div className="donut-total" aria-hidden="true">
        <span>Total spend</span>
        <strong>{money.format(grandTotal)}</strong>
        <small>10 days</small>
      </div>
    </div>
  )
}

export default function App() {
  const [selectedDayId, setSelectedDayId] = useState(days[0].day_id)
  const [selectedCategory, setSelectedCategory] = useState('lodging')

  const selectedDay = days.find((day) => day.day_id === selectedDayId)
  const selectedItinerary = itinerary
    .filter((item) => item.day_id === selectedDayId)
    .sort((a, b) => Number(a.item_order) - Number(b.item_order))

  const totals = Object.fromEntries(
    categories.map((category) => [
      category.id,
      expenses
        .filter((expense) => expense.category === category.id)
        .reduce((sum, expense) => sum + Number(expense.amount_usd), 0),
    ]),
  )
  const grandTotal = Object.values(totals).reduce((sum, total) => sum + total, 0)
  const activeCategory = categories.find((category) => category.id === selectedCategory)
  const dailyCategorySpend = days.map((day) => ({
    ...day,
    amount: expenses
      .filter((expense) => expense.day_id === day.day_id && expense.category === selectedCategory)
      .reduce((sum, expense) => sum + Number(expense.amount_usd), 0),
  }))
  const largestDailySpend = Math.max(...dailyCategorySpend.map((day) => day.amount))

  return (
    <>
    <a className="skip-link" href="#journey">Skip to journey</a>
    <main>
      <header className="hero">
        <nav className="topbar" aria-label="Page sections">
          <a className="wordmark" href="#top" aria-label="Wayfarer home">
            <span>W</span> Wayfarer
          </a>
          <div className="nav-links">
            <a href="#journey">Journey</a>
            <a href="#expenses">Expenses</a>
          </div>
          <span className="trip-year">Summer ’26</span>
        </nav>

        <div className="hero-copy" id="top">
          <p className="eyebrow">A European field journal</p>
          <h1>Ten days,<br /><em>ten cities.</em></h1>
          <p className="intro">From London’s clock towers to Rome’s ancient stones, one rail line, two flights, and a trail of unforgettable days.</p>
          <a className="text-link" href="#journey">Trace the journey <span aria-hidden="true">↓</span></a>
        </div>
        <div className="hero-stamp" aria-hidden="true">
          <span>01—10</span>
          <small>June 2026<br />Europe</small>
        </div>
      </header>

      <section className="journey-section" id="journey" aria-labelledby="journey-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">The route</p>
            <h2 id="journey-title">A city a day</h2>
          </div>
          <p>Select a stop to open the day’s field notes.</p>
        </div>

        <div className="route-scroller" aria-label="Chronological trip route">
          <ol className="route-list">
            {days.map((day) => {
              const selected = day.day_id === selectedDayId
              return (
                <li key={day.day_id} className={selected ? 'is-selected' : ''}>
                  <button
                    className="route-stop"
                    type="button"
                    aria-pressed={selected}
                    aria-controls="day-itinerary"
                    onClick={() => setSelectedDayId(day.day_id)}
                  >
                    <span className="day-tag">Day {String(day.day_number).padStart(2, '0')}</span>
                    <span className="landmark-frame">
                      <img src={day.landmark_image_url} alt={day.iconic_landmark} />
                    </span>
                    <strong>{day.city}</strong>
                    <span className="stop-date">{displayDate(day.date)}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>

        <article className="itinerary-card" id="day-itinerary" aria-live="polite">
          <div className="itinerary-title">
            <div>
              <p className="eyebrow">Day {String(selectedDay.day_number).padStart(2, '0')} · {displayDate(selectedDay.date)}</p>
              <h3>{selectedDay.city}, <em>{selectedDay.country}</em></h3>
            </div>
            <span className="entry-number" aria-hidden="true">#{selectedDay.day_number}</span>
          </div>
          <div className="table-scroll">
            <table>
              <caption className="sr-only">Itinerary for {selectedDay.city} on {displayDate(selectedDay.date)}</caption>
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Place</th>
                  <th scope="col">Activity</th>
                </tr>
              </thead>
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

      <section className="expense-section" id="expenses" aria-labelledby="expense-title">
        <div className="section-heading expense-heading">
          <div>
            <p className="eyebrow">The ledger</p>
            <h2 id="expense-title">Where it went</h2>
          </div>
          <p>A trip measured in moments, meals, and miles. Select a category to compare the cities.</p>
        </div>

        <div className="expense-grid">
          <div className="distribution-card">
            <DonutChart totals={totals} grandTotal={grandTotal} selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
            <div className="legend" aria-label="Expense categories">
              {categories.map((category) => {
                const selected = category.id === selectedCategory
                return (
                  <button
                    type="button"
                    key={category.id}
                    className={selected ? 'is-selected' : ''}
                    aria-pressed={selected}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <span className="legend-dot" style={{ backgroundColor: category.color }} />
                    <span>{category.label}<small>{Math.round((totals[category.id] / grandTotal) * 100)}% of total</small></span>
                    <strong>{money.format(totals[category.id])}</strong>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="comparison-card" aria-live="polite">
            <div className="comparison-title">
              <div>
                <p className="eyebrow">City comparison</p>
                <h3>{activeCategory.label} <em>by day</em></h3>
              </div>
              <strong style={{ color: activeCategory.color }}>{money.format(totals[selectedCategory])}</strong>
            </div>
            <ol className="bar-list">
              {dailyCategorySpend.map((day) => (
                <li key={day.day_id}>
                  <span className="bar-day">{String(day.day_number).padStart(2, '0')}</span>
                  <span className="bar-city">{day.city}</span>
                  <span className="bar-track">
                    <span
                      className="bar-fill"
                      style={{ width: `${(day.amount / largestDailySpend) * 100}%`, backgroundColor: activeCategory.color }}
                    />
                  </span>
                  <strong>{money.format(day.amount)}</strong>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <footer>
        <span>London</span><i aria-hidden="true" /><span>Rome</span>
        <p>10 days · 10 cities · 1 unforgettable route</p>
      </footer>
    </main>
    </>
  )
}
