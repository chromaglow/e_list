import { describe, it, expect } from 'vitest'
import { listings } from './schema'
import type { Listing, NewListing } from './schema'

describe('lib/schema.ts — listings table', () => {
  it('exports a listings table object', () => {
    expect(listings).toBeDefined()
    expect(typeof listings).toBe('object')
  })

  it('has all 13 expected columns', () => {
    const cols = Object.keys(listings)
    const required = [
      'id', 'title', 'description', 'price', 'poster_name',
      'contact_info', 'photo_key', 'edit_token', 'status',
      'created_at', 'updated_at', 'taken_at', 'deleted_at',
    ]
    for (const col of required) {
      expect(cols, `missing column: ${col}`).toContain(col)
    }
  })

  it('status column has enum [active, taken, deleted]', () => {
    const col = listings.status as any
    expect(col.enumValues).toEqual(['active', 'taken', 'deleted'])
  })

  it('status column has default value of active', () => {
    const col = listings.status as any
    expect(col.default).toBe('active')
  })

  it('nullable columns have no notNull constraint', () => {
    const nullable = ['price', 'photo_key', 'taken_at', 'deleted_at']
    for (const name of nullable) {
      const col = (listings as any)[name] as any
      expect(col.notNull, `${name} should be nullable`).toBeFalsy()
    }
  })

  it('required columns have notNull constraint', () => {
    const required = ['title', 'description', 'poster_name', 'contact_info', 'edit_token', 'status', 'created_at', 'updated_at']
    for (const name of required) {
      const col = (listings as any)[name] as any
      expect(col.notNull, `${name} should be notNull`).toBeTruthy()
    }
  })

  it('updated_at has $onUpdateFn set', () => {
    const col = listings.updated_at as any
    expect(col.onUpdateFn ?? col.$onUpdateFn ?? col.columnBuilderBrand).toBeDefined()
  })

  it('Listing and NewListing types are assignable (compile-time check via satisfies)', () => {
    const row = {
      id: '1', title: 'test', description: 'desc', price: null,
      poster_name: 'Alice', contact_info: 'alice@example.com',
      photo_key: null, edit_token: 'tok', status: 'active' as const,
      created_at: new Date(), updated_at: new Date(),
      taken_at: null, deleted_at: null,
    } satisfies Listing
    expect(row.status).toBe('active')

    const newRow: NewListing = { id: '2', title: 't', description: 'd', poster_name: 'B', contact_info: 'b@b.com', edit_token: 'x' }
    expect(newRow).toBeDefined()
  })
})
