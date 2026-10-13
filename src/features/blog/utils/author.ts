/**
 * Author name from a post's author reference. TypeGen types a required reference as present, but
 * deleting an author that posts still point at leaves it dangling (null at runtime), and one
 * missing byline shouldn't take the page down.
 */
export function authorName(author: { name: string } | null | undefined) {
  return author?.name
}
