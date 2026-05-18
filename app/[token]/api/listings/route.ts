import { z } from 'zod'
import { nanoid } from 'nanoid'
import { db } from '@/lib/db'
import { listings } from '@/lib/schema'

const CreateListingSchema = z.object({
  title:       z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  price:       z.string().max(100).optional(),
  posterName:  z.string().min(1).max(100),
  contactInfo: z.string().min(1).max(200),
  photoKey:    z.string().max(500).optional(),
})

export async function POST(request: Request) {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const parsed = CreateListingSchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { title, description, price, posterName, contactInfo, photoKey } = parsed.data

  const id = nanoid()
  const editToken = crypto.randomUUID()

  await db.insert(listings).values({
    id,
    title,
    description,
    price: price ?? null,
    poster_name: posterName,
    contact_info: contactInfo,
    photo_key: photoKey ?? null,
    edit_token: editToken,
    status: 'active',
  })

  return Response.json({ id, editToken }, { status: 201 })
}
