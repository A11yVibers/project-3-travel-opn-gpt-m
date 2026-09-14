import { useState } from 'react'
import tripDaysCsv from '../project-assets/trip_days.csv?raw'
import itineraryCsv from '../project-assets/itinerary.csv?raw'
import expensesCsv from '../project-assets/expenses.csv?raw'

const EXPENSE_CATEGORIES = [
  { key: 'lodging', label: 'Lodging', color: '#e85d3f' },
  { key: 'food', label: 'Food', color: '#e4a53b' },
  { key: 'entertainment', label: 'Entertainment', color: '#2f8b7d' },
  { key: 'travel', label: 'Travel', color: '#315d81' },
]

function parseCsv(csv) {
  const rows = []
  let row = []
  let value = ''
  let quoted = false

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index]
    if (character === '"' && quoted && csv[index + 1] === '"') {
      value += '"'
      index += 1
    } else if (character === '"') {
      quoted = !quoted
    } else if (character === ',' && !quoted) {
      row.push(value)
      value = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && csv[index + 1] === '\n') index += 1
      row.push(value)
      if (row.some((cell) => cell.length)) rows.push(row)
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
  return records.map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ''])))
}

const tripDays = parseCsv(tripDaysCsv).sort((a, b) => Number(a.day_number) - Number(b.day_number))
const itinerary = parseCsv(itineraryCsv)
const expenses = parseCsv(expensesCsv)

const formatDate = (date) => new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}).format(new Date(`${date}T12:00:00`))

const formatMoney = (amount) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
}).format(amount)

const categoryTotals = Object.fromEntries(EXPENSE_CATEGORIES.map(({ key }) => [
  key,
  expenses.filter((expense) => expense.category === key).reduce((sum, expense) => sum + Number(expense.amount_usd), 0),
]))
const totalSpend = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0)

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  )
}

function Journey({ selectedDay, onSelectDay }) {
  return (
    <section className="journey-section" aria-labelledby="journey-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">The journey</p>
          <h2 id="journey-title">Ten cities, one story</h2>
        </div>
        <p className="section-note">Select a stop to revisit the day</p>
      </div>

      <div className="journey-scroll">
        <ol className="journey-track">
          {tripDays.map((day, index) => {
            const isSelected = day.day_id === selectedDay
            return (
              <li className="journey-stop" key={day.day_id}>
                <button
                  className={`day-node${isSelected ? ' is-selected' : ''}`}
                  type="button"
                  onClick={() => onSelectDay(day.day_id)}
                  aria-pressed={isSelected}
                  aria-label={`Day ${day.day_number}, ${day.city}, ${formatDate(day.date)}`}
                >
                  <span className="day-number">Day {String(day.day_number).padStart(2, '0')}</span>
                  <span className="landmark-frame">
                    <img src={day.landmark_image_url} alt={day.iconic_landmark} />
                  </span>
                  <span className="city-name">{day.city}</span>
                  <span className="day-date">{formatDate(day.date)}</span>
                </button>
                {index < tripDays.length - 1 && <span className="journey-arrow"><ArrowIcon /></span>}
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

function DayItinerary({ dayId }) {
  const day = tripDays.find((item) => item.day_id === dayId)
  const schedule = itinerary
    .filter((item) => item.day_id === dayId)
    .sort((a, b) => Number(a.item_order) - Number(b.item_order))

  return (
    <section className="itinerary-card" aria-labelledby="itinerary-title">
      <div className="itinerary-intro">
        <p className="eyebrow">Day {String(day.day_number).padStart(2, '0')} itinerary</p>
        <h2 id="itinerary-title">A day in {day.city}</h2>
        <p>{day.country} <span aria-hidden="true">·</span> {formatDate(day.date)}</p>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Place</th>
              <th scope="col">Activity</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((item) => (
              <tr key={`${item.day_id}-${item.item_order}`}>
                <td><time>{item.time}</time></td>
                <td>{item.place}</td>
                <td>{item.activity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function DonutChart({ selectedCategory, onSelectCategory }) {
  const radius = 72
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="donut-wrap">
      <svg className="donut" viewBox="0 0 180 180" role="img" aria-label="Overall trip expense distribution">
        <circle className="donut-base" cx="90" cy="90" r={radius} />
        {EXPENSE_CATEGORIES.map((category) => {
          const portion = categoryTotals[category.key] / totalSpend
          const length = portion * circumference
          const currentOffset = offset
          offset += length
          return (
            <circle
              key={category.key}
              className={`donut-segment${selectedCategory === category.key ? ' is-selected' : ''}`}
              cx="90"
              cy="90"
              r={radius}
              stroke={category.color}
              strokeDasharray={`${Math.max(0, length - 2)} ${circumference - Math.max(0, length - 2)}`}
              strokeDashoffset={-currentOffset}
              onClick={() => onSelectCategory(category.key)}
              tabIndex="0"
              role="button"
              aria-label={`${category.label}: ${formatMoney(categoryTotals[category.key])}`}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelectCategory(category.key)
                }
              }}
            />
          )
        })}
      </svg>
      <div className="donut-center" aria-hidden="true">
        <strong>{formatMoney(totalSpend)}</strong>
        <span>Total spend</span>
      </div>
    </div>
  )
}

function ExpenseChart({ selectedCategory, onSelectCategory }) {
  const selected = EXPENSE_CATEGORIES.find((category) => category.key === selectedCategory)
  const dailyTotals = tripDays.map((day) => ({
    ...day,
    total: expenses
      .filter((expense) => expense.day_id === day.day_id && expense.category === selectedCategory)
      .reduce((sum, expense) => sum + Number(expense.amount_usd), 0),
  }))
  const maxDaily = Math.max(...dailyTotals.map((day) => day.total))

  return (
    <section className="expenses-section" aria-labelledby="expenses-title">
      <div className="section-heading expense-heading">
        <div>
          <p className="eyebrow">The spend</p>
          <h2 id="expenses-title">Where the money went</h2>
        </div>
        <p className="section-note">Select a category to compare cities</p>
      </div>

      <div className="expense-layout">
        <div className="expense-overview">
          <DonutChart selectedCategory={selectedCategory} onSelectCategory={onSelectCategory} />
          <div className="category-list" aria-label="Expense categories">
            {EXPENSE_CATEGORIES.map((category) => {
              const isSelected = selectedCategory === category.key
              return (
                <button
                  type="button"
                  key={category.key}
                  className={isSelected ? 'is-selected' : ''}
                  onClick={() => onSelectCategory(category.key)}
                  aria-pressed={isSelected}
                >
                  <span className="category-dot" style={{ backgroundColor: category.color }} />
                  <span>{category.label}</span>
                  <strong>{formatMoney(categoryTotals[category.key])}</strong>
                </button>
              )
            })}
          </div>
        </div>

        <div className="city-comparison">
          <div className="comparison-title">
            <span className="category-dot" style={{ backgroundColor: selected.color }} />
            <div>
              <p>{selected.label} by day</p>
              <strong>{formatMoney(categoryTotals[selected.key])} total</strong>
            </div>
          </div>
          <div className="bar-chart">
            {dailyTotals.map((day) => (
              <div className="bar-row" key={day.day_id}>
                <span className="bar-day">{String(day.day_number).padStart(2, '0')}</span>
                <span className="bar-city">{day.city}</span>
                <span className="bar-track">
                  <span
                    className="bar-fill"
                    style={{ width: `${(day.total / maxDaily) * 100}%`, backgroundColor: selected.color }}
                  />
                </span>
                <strong>{formatMoney(day.total)}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function App() {
  const [selectedDay, setSelectedDay] = useState(tripDays[0].day_id)
  const [selectedCategory, setSelectedCategory] = useState('lodging')

  return (
    <main>
      <header className="hero">
        <nav aria-label="Journal navigation">
          <a className="wordmark" href="#top" aria-label="Roam journal home">ROAM<span>’26</span></a>
          <div>
            <a href="#journey">Journey</a>
            <a href="#expenses">Expenses</a>
          </div>
        </nav>
        <div className="hero-content" id="top">
          <div>
            <p className="hero-kicker">A European travel journal</p>
            <h1>10 days.<br /><em>10 cities.</em></h1>
          </div>
          <div className="hero-summary">
            <p>A fast-moving summer through Europe, from London’s clock towers to Rome’s ancient streets.</p>
            <span>01—10 June, 2026</span>
          </div>
        </div>
        <div className="route-line" aria-hidden="true">
          <span>London</span><i /><span>Paris</span><i /><span>Brussels</span><i /><span>Amsterdam</span><i /><span>Rome</span>
        </div>
      </header>

      <div id="journey">
        <Journey selectedDay={selectedDay} onSelectDay={setSelectedDay} />
      </div>
      <DayItinerary dayId={selectedDay} />
      <div id="expenses">
        <ExpenseChart selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
      </div>

      <footer>
        <span>ROAM ’26</span>
        <p>Ten days, kept forever.</p>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  )
}
