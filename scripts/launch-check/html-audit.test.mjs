import { describe, expect, it } from 'vitest'

import {
  getAnchorHrefs,
  getHeadings,
  getImages,
  getJsonLdScripts,
  hasMinimalMarker,
  readMain,
} from './html.mjs'

describe('page audit readers', () => {
  it('lists the headings a visitor could see, in order', () => {
    const html = `<body><h1>Home &amp; away</h1><!-- <h2>gone</h2> --><template><h2>Template</h2></template>
      <section><h2>Services</h2><h4>
      Skipped   level</h4></section></body>`
    expect(getHeadings(html)).toEqual([
      { level: 1, text: 'Home & away' },
      { level: 2, text: 'Services' },
      { level: 4, text: 'Skipped level' },
    ])
  })

  it('tells a missing alt from an empty one, and notes decorative images', () => {
    const html = `<img src="/a.png"><img src="/b.png" alt=""><img src="/c.png" alt="A bridge">
      <img src="/d.png" role="presentation"><img src="/e.png" aria-hidden="true"><noscript><img src="/n.png"></noscript>`
    expect(getImages(html)).toEqual([
      { src: '/a.png', alt: null, decorative: false },
      { src: '/b.png', alt: '', decorative: false },
      { src: '/c.png', alt: 'A bridge', decorative: false },
      { src: '/d.png', alt: null, decorative: true },
      { src: '/e.png', alt: null, decorative: true },
    ])
  })

  it('reads link addresses and skips empty ones', () => {
    expect(
      getAnchorHrefs(
        `<a href="/about">About</a><a>none</a><a href=" ">blank</a><a href='/x#y'>x</a>`,
      ),
    ).toEqual(['/about', '/x#y'])
  })

  it('returns the JSON-LD scripts untouched, including ones that are not valid JSON', () => {
    const html = `<script type="application/ld+json">{"@type":"WebPage"}</script>
      <script type='application/ld+json'> {oops </script><script>var a = 1</script>`
    expect(getJsonLdScripts(html)).toEqual(['{"@type":"WebPage"}', '{oops'])
  })

  it('recognises the Minimal page marker', () => {
    expect(hasMinimalMarker('<div data-minimal-page="">x</div>')).toBe(true)
    expect(hasMinimalMarker('<div class="data-minimal-page-not">x</div>')).toBe(false)
  })

  describe('readMain', () => {
    it('counts the words in <main> and nothing outside it', () => {
      const html = `<body><header>Not counted here</header><main id="m"><h1>One two</h1>
        <p>Three <b>four</b> five</p><script>ignored words here</script><img src="/a.png"></main>
        <footer>Nor here</footer></body>`
      expect(readMain(html)).toEqual({ found: true, words: 5, nosnippetWords: 0 })
    })

    it('reports a page without a <main>', () => {
      expect(readMain('<body><div>Words</div></body>')).toEqual({
        found: false,
        words: 0,
        nosnippetWords: 0,
      })
    })

    it('counts words under data-nosnippet, including on <main> itself', () => {
      const inner = readMain(
        '<main><p>Shown words</p><div data-nosnippet><p>Hidden from snippets</p></div></main>',
      )
      expect(inner).toEqual({ found: true, words: 5, nosnippetWords: 3 })
      const wrapper = readMain('<main data-nosnippet><p>All of it</p></main>')
      expect(wrapper).toEqual({ found: true, words: 3, nosnippetWords: 3 })
      const above = readMain('<div data-nosnippet><main><p>Every word</p></main></div>')
      expect(above.nosnippetWords).toBe(2)
    })

    it('copes with a stray closing tag and void elements', () => {
      const html =
        '<main><p>One<br>two</span> three<hr><input type="text"> four</p></main><p>out</p>'
      expect(readMain(html).words).toBe(4)
    })
  })
})
