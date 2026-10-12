import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl px-6 py-32 text-center">
      <h1 className="text-4xl font-semibold">Page not found</h1>
      <Link href="/" className="mt-6 inline-block underline">
        Go home
      </Link>
    </section>
  )
}
