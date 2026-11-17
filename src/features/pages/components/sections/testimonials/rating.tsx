const STAR = 'M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z'

/**
 * The rating a client copied from where the quote came from, in five whole stars. Named once for a screen
 * reader; the stars themselves say nothing. It is the client's own words, not an aggregate or a live
 * figure, and there is no review markup anywhere near it (task 156 item 7).
 */
export function TestimonialRating({ rating }: { rating: number }) {
  return (
    <div
      role="img"
      aria-label={`Rated ${String(rating)} out of 5`}
      className="mb-4 flex gap-0.5 text-ink"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-5"
          fill={star <= rating ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        >
          <path d={STAR} />
        </svg>
      ))}
    </div>
  )
}
