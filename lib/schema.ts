import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const listings = sqliteTable('listings', {
  id:           text('id').primaryKey(),
  title:        text('title').notNull(),
  description:  text('description').notNull(),
  price:        text('price'),
  poster_name:  text('poster_name').notNull(),
  contact_info: text('contact_info').notNull(),
  photo_key:    text('photo_key'),
  edit_token:   text('edit_token').notNull(),
  status:       text('status', { enum: ['active', 'taken', 'deleted'] }).notNull().default('active'),
  created_at:   integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updated_at:   integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
  taken_at:     integer('taken_at',   { mode: 'timestamp' }),
  deleted_at:   integer('deleted_at', { mode: 'timestamp' }),
})

export type Listing    = typeof listings.$inferSelect
export type NewListing = typeof listings.$inferInsert

export const settings = sqliteTable('settings', {
  key:   text('key').primaryKey(),
  value: text('value').notNull(),
})

export type Setting    = typeof settings.$inferSelect
export type NewSetting = typeof settings.$inferInsert
