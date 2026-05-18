import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// Mock drizzle-orm operators
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val, type: 'eq' })),
  desc: vi.fn((col) => ({ col, type: 'desc' })),
}))

// Mock schema (listings object used as reference in queries)
vi.mock('@/lib/schema', () => ({
  listings: { status: 'status_col', created_at: 'created_at_col' },
}))

// Mock db with chainable select and direct insert
vi.mock('@/lib/db', () => {
  const mockOrderBy = vi.fn()
  const mockWhere = vi.fn()
  const mockFrom = vi.fn()
  const mockSelect = vi.fn()
  const mockInsertValues = vi.fn()
  const mockInsert = vi.fn()

  mockSelect.mockReturnValue({ from: mockFrom })
  mockFrom.mockReturnValue({ where: mockWhere })
  mockWhere.mockReturnValue({ orderBy: mockOrderBy })
  mockOrderBy.mockResolvedValue([])
  mockInsert.mockReturnValue({ values: mockInsertValues })
  mockInsertValues.mockResolvedValue(undefined)

  return {
    db: {
      select: mockSelect,
      insert: mockInsert,
    },
  }
})

import { getActiveListings, createListing } from './listing-service'
import { db } from '@/lib/db'
import { listings } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'

// Fixture data with Date objects (Drizzle mode: 'timestamp' returns Date instances)
const fixtureListings = [
  {
    id: 'abc123',
    title: 'Free couch',
    description: 'Good condition',
    price: null,
    poster_name: 'Alice',
    contact_info: 'alice@example.com',
    photo_key: null,
    edit_token: 'tok-1',
    status: 'active' as const,
    created_at: new Date('2026-05-18T12:00:00Z'),
    updated_at: new Date('2026-05-18T12:00:00Z'),
    taken_at: null,
    deleted_at: null,
  },
  {
    id: 'def456',
    title: 'Vintage lamp',
    description: 'Works great',
    price: '$10',
    poster_name: 'Bob',
    contact_info: 'bob@example.com',
    photo_key: 'https://blob.example.com/lamp.jpg',
    edit_token: 'tok-2',
    status: 'active' as const,
    created_at: new Date('2026-05-17T10:00:00Z'),
    updated_at: new Date('2026-05-17T10:00:00Z'),
    taken_at: null,
    deleted_at: null,
  },
]

// Helper: set up fresh chain mock for db.select() → from → where → orderBy
function setupSelectChain(resolveValue: typeof fixtureListings) {
  const mockOrderBy = vi.fn().mockResolvedValue(resolveValue)
  const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy })
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
  vi.mocked(db.select).mockReturnValue({ from: mockFrom } as unknown as ReturnType<typeof db.select>)
  return { mockFrom, mockWhere, mockOrderBy }
}

// Helper: set up fresh insert chain
function setupInsertChain() {
  const mockInsertValues = vi.fn().mockResolvedValue(undefined)
  vi.mocked(db.insert).mockReturnValue({ values: mockInsertValues } as unknown as ReturnType<typeof db.insert>)
  return { mockInsertValues }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getActiveListings()', () => {
  it('calls db.select().from(listings).where(eq(status, active)).orderBy(desc(created_at))', async () => {
    const { mockFrom, mockWhere, mockOrderBy } = setupSelectChain(fixtureListings)

    await getActiveListings()

    expect(db.select).toHaveBeenCalledOnce()
    expect(mockFrom).toHaveBeenCalledWith(listings)
    expect(eq).toHaveBeenCalledWith(listings.status, 'active')
    expect(mockWhere).toHaveBeenCalledOnce()
    expect(desc).toHaveBeenCalledWith(listings.created_at)
    expect(mockOrderBy).toHaveBeenCalledOnce()
  })

  it('returns the array resolved by the query', async () => {
    setupSelectChain(fixtureListings)
    const result = await getActiveListings()
    expect(result).toEqual(fixtureListings)
    expect(result).toHaveLength(2)
  })

  it('returns Date objects for created_at fields (Drizzle mode: timestamp)', async () => {
    setupSelectChain(fixtureListings)
    const result = await getActiveListings()
    for (const row of result) {
      expect(row.created_at).toBeInstanceOf(Date)
    }
  })

  it('returns newest-first ordered results (fixture order preserved from mock)', async () => {
    setupSelectChain(fixtureListings)
    const result = await getActiveListings()
    // First item has a later created_at than second item
    expect(result[0].created_at.getTime()).toBeGreaterThan(result[1].created_at.getTime())
  })
})

describe('createListing()', () => {
  it('calls db.insert(listings).values(data)', async () => {
    const { mockInsertValues } = setupInsertChain()

    const newListing = {
      id: 'new-id',
      title: 'Test item',
      description: 'A test',
      poster_name: 'Tester',
      contact_info: 'test@example.com',
      edit_token: 'tok-new',
      status: 'active' as const,
      created_at: new Date(),
      updated_at: new Date(),
      price: null,
      photo_key: null,
      taken_at: null,
      deleted_at: null,
    }

    await createListing(newListing)

    expect(db.insert).toHaveBeenCalledWith(listings)
    expect(mockInsertValues).toHaveBeenCalledWith(newListing)
  })

  it('resolves without returning a value', async () => {
    setupInsertChain()

    const newListing = {
      id: 'new-id-2',
      title: 'Another item',
      description: 'Another test',
      poster_name: 'Tester',
      contact_info: 'test@example.com',
      edit_token: 'tok-new-2',
      status: 'active' as const,
      created_at: new Date(),
      updated_at: new Date(),
      price: null,
      photo_key: null,
      taken_at: null,
      deleted_at: null,
    }
    const result = await createListing(newListing)
    expect(result).toBeUndefined()
  })
})
