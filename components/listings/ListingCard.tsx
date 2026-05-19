// components/listings/ListingCard.tsx — Card for a single active listing.
// Server Component (rendered server-side only). No 'use client'.

import Image from 'next/image'
import type { Listing } from '@/lib/schema'
import MarkTakenButton from './MarkTakenButton'
import AdminDeleteButton from './AdminDeleteButton'

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface Props {
  listing: Listing
  token: string
  isAdmin: boolean
}
export default function ListingCard({ listing, token, isAdmin }: Props) {
  return (
    <article className="rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* Photo */}
      <div className="relative aspect-[4/3] w-full bg-muted">
        {listing.photo_key ? (
          <Image
            src={listing.photo_key}
            alt={listing.title}
            fill
            className="object-cover"
            loading="lazy"
            sizes="(max-width: 640px) 100vw, 640px"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-2xl font-semibold text-muted-foreground">No image</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pt-3 pb-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold leading-snug">{listing.title}</h2>
          {listing.price
            ? <span className="text-sm font-normal shrink-0">{listing.price}</span>
            : <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">FREE</span>
          }
        </div>

        {/* Description */}
        <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
          {listing.description}
        </p>

        {/* Poster info */}
        <div className="mt-3 text-sm">
          <span className="font-normal">{listing.poster_name}</span>
          <span className="mx-1.5 text-muted-foreground">·</span>
          <span className="text-muted-foreground">{listing.contact_info}</span>
        </div>

        {/* Date */}
        <time
          dateTime={listing.created_at.toISOString()}
          className="mt-1 block text-xs text-muted-foreground"
        >
          {formatDate(listing.created_at)}
        </time>

        <div className="mt-3 flex gap-2">
          <MarkTakenButton listingId={listing.id} token={token} />
          {isAdmin && <AdminDeleteButton listingId={listing.id} token={token} />}
        </div>
      </div>
    </article>
  )
}
