import { describe, expect, it } from 'vitest'
import type { CombatEvent, FieldConditionView } from '../types'
import {
  fieldConditionChip,
  fieldConditionVisual,
  fieldDamageLabel,
  formatFieldConditionTime,
  isFieldEvent,
  viewedFieldConditionId,
} from './fieldConditions'

const rain: FieldConditionView = {
  id: 'rain',
  name: 'Rain',
  description: 'Water damage +25%.',
  icon: '/assets/field-conditions/rain.png',
  remainingMs: 4200,
}

function event(type: CombatEvent['type'], value = 30): CombatEvent {
  return { timestamp: 1, type, sourceId: 'unit', targetId: 'unit', value, skillName: 'sandstorm' }
}

describe('fieldConditions', () => {
  it('shows the viewed player condition in combat and the forecast in planning', () => {
    expect(
      fieldConditionChip(
        { phase: 'COMBAT', fieldConditions: { me: rain }, fieldForecast: null },
        'me',
      ),
    ).toEqual({ condition: rain, forecast: false })
    expect(
      fieldConditionChip(
        { phase: 'COMBAT', fieldConditions: { me: rain }, fieldForecast: null },
        'other',
      ),
    ).toBeNull()
    expect(
      fieldConditionChip({ phase: 'PLANNING', fieldConditions: {}, fieldForecast: rain }, 'me'),
    ).toEqual({ condition: rain, forecast: true })
    expect(
      fieldConditionChip({ phase: 'LOBBY', fieldConditions: {}, fieldForecast: rain }, 'me'),
    ).toBeNull()
  })

  it('maps known condition ids to particle families', () => {
    expect(fieldConditionVisual('rain')).toBe('rain')
    expect(fieldConditionVisual('sandstorm')).toBe('sand')
    expect(fieldConditionVisual('clear')).toBeNull()
    expect(fieldConditionVisual(null)).toBeNull()
    expect(viewedFieldConditionId({ phase: 'COMBAT', fieldConditions: { me: rain } }, 'me')).toBe(
      'rain',
    )
    expect(
      viewedFieldConditionId({ phase: 'PLANNING', fieldConditions: { me: rain } }, 'me'),
    ).toBeNull()
  })

  it('formats remaining time and keeps whole-combat conditions untimed', () => {
    expect(formatFieldConditionTime(4200)).toBe('5s')
    expect(formatFieldConditionTime(0)).toBe('0s')
    expect(formatFieldConditionTime(null)).toBeNull()
  })

  it('treats field events as non-attacks with damage numbers only for field damage', () => {
    expect(isFieldEvent(event('FIELD'))).toBe(true)
    expect(isFieldEvent(event('FIELD_DAMAGE'))).toBe(true)
    expect(isFieldEvent(event('DAMAGE'))).toBe(false)
    expect(fieldDamageLabel(event('FIELD_DAMAGE'))).toBe('-30')
    expect(fieldDamageLabel(event('FIELD_DAMAGE', 0))).toBeNull()
    expect(fieldDamageLabel(event('DAMAGE'))).toBeNull()
  })
})
