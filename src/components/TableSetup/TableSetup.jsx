import React, { useState } from 'react'
import { useGame } from '../../store/gameStore.jsx'
import './TableSetup.css'

export default function TableSetup() {
  const { dispatch } = useGame()

  const [form, setForm] = useState({
    name: '',
    buyIn: '1000',
    smallBlind: '5',
    bigBlind: '10',
  })

  const [errors, setErrors] = useState({})

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  function validate() {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Table name is required'
    if (!form.buyIn || Number(form.buyIn) <= 0) errs.buyIn = 'Buy-in must be > 0'
    if (!form.smallBlind || Number(form.smallBlind) <= 0) errs.smallBlind = 'Small blind must be > 0'
    if (!form.bigBlind || Number(form.bigBlind) <= 0) errs.bigBlind = 'Big blind must be > 0'
    if (Number(form.bigBlind) <= Number(form.smallBlind)) errs.bigBlind = 'Big blind must be > small blind'
    return errs
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    dispatch({
      type: 'CREATE_TABLE',
      payload: {
        name: form.name.trim(),
        buyIn: Number(form.buyIn),
        smallBlind: Number(form.smallBlind),
        bigBlind: Number(form.bigBlind),
      },
    })
  }

  function handleBack() {
    dispatch({ type: 'NAVIGATE', payload: 'home' })
  }

  return (
    <div className="table-setup screen">
      <div className="screen-header">
        <button className="back-btn" onClick={handleBack}>← Back</button>
        <h1 className="screen-title">New Table</h1>
      </div>

      <form onSubmit={handleSubmit} className="table-setup-form card">
        <div className="form-group">
          <label htmlFor="name">Table Name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Friday Night Game"
            autoFocus
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="buyIn">Starting Chips (Buy-in)</label>
          <input
            id="buyIn"
            name="buyIn"
            type="number"
            min="1"
            value={form.buyIn}
            onChange={handleChange}
            placeholder="1000"
          />
          {errors.buyIn && <span className="field-error">{errors.buyIn}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="smallBlind">Small Blind</label>
            <input
              id="smallBlind"
              name="smallBlind"
              type="number"
              min="1"
              value={form.smallBlind}
              onChange={handleChange}
              placeholder="5"
            />
            {errors.smallBlind && <span className="field-error">{errors.smallBlind}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="bigBlind">Big Blind</label>
            <input
              id="bigBlind"
              name="bigBlind"
              type="number"
              min="1"
              value={form.bigBlind}
              onChange={handleChange}
              placeholder="10"
            />
            {errors.bigBlind && <span className="field-error">{errors.bigBlind}</span>}
          </div>
        </div>

        <div className="table-setup-preview">
          <div className="preview-item">
            <span className="preview-label">Buy-in</span>
            <span className="preview-value chip-badge">{form.buyIn || 0}</span>
          </div>
          <div className="preview-item">
            <span className="preview-label">Blinds</span>
            <span className="preview-value">{form.smallBlind || 0} / {form.bigBlind || 0}</span>
          </div>
        </div>

        <button type="submit" className="btn-primary table-setup-submit">
          Continue to Player Setup →
        </button>
      </form>
    </div>
  )
}
