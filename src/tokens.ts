import {ExternalTokenizer} from "@lezer/lr"
import {interpolationStart, tagStart, endTagStart, text, InlineComment,
        commentText, endcommentTagStart, rawText, endrawTagStart} from "./liquid.grammar.terms"

const enum Ch {
  BraceL = 123, BraceR = 125, Percent = 37, Dash = 45, Hash = 35,
  Space = 32, Newline = 10,
  e = 101, n = 110, d = 100
}

function wordChar(code: number) {
  return code >= 65 && code <= 90 || code >= 97 && code <= 122
}

export const base = new ExternalTokenizer(input => {
  let start = input.pos
  for (;;) {
    let {next} = input
    if (next < 0) break
    if (next == Ch.BraceL) {
      let after = input.peek(1)
      if (after == Ch.BraceL) {
        if (input.pos > start) break
        input.acceptToken(interpolationStart, 2)
        return
      } else if (after == Ch.Percent) {
        if (input.pos > start) break
        let scan = 2, size = 2
        for (;;) {
          let next = input.peek(scan)
          if (next == Ch.Space || next == Ch.Newline) {
            ++scan
          } else if (next == Ch.Hash) {
            ++scan
            for (;;) {
              let comment = input.peek(scan)
              if (comment < 0 || comment == Ch.Newline) break
              scan++
            }
          } else if (next == Ch.Dash && size == 2) {
            size = ++scan
          } else {
            let end = next == Ch.e && input.peek(scan + 1) == Ch.n && input.peek(scan + 2) == Ch.d
            input.acceptToken(end ? endTagStart : tagStart, size)
            return
          }
        }
      }
    }
    input.advance()
    if (next == Ch.Newline) break
  }
  if (input.pos > start) input.acceptToken(text)
})

function rawTokenizer(endTag: string, text: number, tagStart: number) {
  return new ExternalTokenizer(input => {
    let start = input.pos
    for (;;) {
      let {next} = input
      if (next == Ch.BraceL && input.peek(1) == Ch.Percent) {
        let scan = 2
        for (;; scan++) {
          let ch = input.peek(scan)
          if (ch != Ch.Space && ch != Ch.Newline) break
        }
        let word = ""
        for (;; scan++) {
          let next = input.peek(scan)
          if (!wordChar(next)) break
          word += String.fromCharCode(next)
        }
        if (word == endTag) {
          if (input.pos > start) break
          input.acceptToken(tagStart, 2)
          break
        }
      } else if (next < 0) {
        break
      }
      input.advance()
      if (next == Ch.Newline) break
    }
    if (input.pos > start) input.acceptToken(text)
  })
}

export const comment = rawTokenizer("endcomment", commentText, endcommentTagStart)

export const raw = rawTokenizer("endraw", rawText, endrawTagStart)

export const inlineComment = new ExternalTokenizer(input => {
  if (input.next != Ch.Hash) return
  input.advance()
  for (;;) {
    if (input.next as number == Ch.Newline || input.next < 0) break
    if ((input.next as number == Ch.Percent || input.next as number == Ch.BraceR) && input.peek(1) == Ch.BraceR) break
    input.advance()
  }
  input.acceptToken(InlineComment)
})
