import {EditorState, EditorSelection} from "@codemirror/state"
import {EditorView} from "@codemirror/view"
import {syntaxTree} from "@codemirror/language"
import {CompletionContext, CompletionResult, Completion} from "@codemirror/autocomplete"
import {SyntaxNode} from "@lezer/common"

function completions(words: string, type: string): readonly Completion[] {
  return words.split(" ").map(label => ({label, type}))
}

const Filters = completions(
  "abs append at_least at_most capitalize ceil compact concat date default " +
  "divided_by downcase escape escape_once first floor join last lstrip map minus modulo " +
  "newline_to_br plus prepend remove remove_first replace replace_first reverse round rstrip " +
  "size slice sort sort_natural split strip strip_html strip_newlines sum times truncate " +
  "truncatewords uniq upcase url_decode url_encode where", "function")

const Tags = completions(
  "cycle comment endcomment raw endraw echo increment decrement liquid if elsif " +
  "else endif unless endunless case endcase for endfor tablerow endtablerow break continue " +
  "assign capture endcapture render include", "keyword")

const Expressions = completions("empty forloop tablerowloop in with as contains", "keyword")

const forloop = completions("first index index0 last length rindex", "property")
const tablerowloop = completions("col col0 col_first col_last first index index0 last length rindex rindex0 row", "property")

function findContext(context: CompletionContext): {type: string, node?: SyntaxNode, target?: SyntaxNode, from?: number} | null {
  let {state, pos} = context
  let node = syntaxTree(state).resolveInner(pos, -1).enterUnfinishedNodesBefore(pos)
  let before = node.childBefore(pos)?.name || node.name
  if (node.name == "FilterName")
    return {type: "filter", node}
  if (context.explicit && before == "|")
    return {type: "filter"}
  if (node.name == "TagName")
    return {type: "tag", node}
  if (context.explicit && before == "{%")
    return {type: "tag"}
  if (node.name == "PropertyName" && node.parent!.name == "MemberExpression")
    return {type: "property", node, target: node.parent!}
  if (node.name == "." && node.parent!.name == "MemberExpression")
    return {type: "property", target: node.parent!}
  if (node.name == "MemberExpression" && before == ".")
    return {type: "property", target: node}
  if (node.name == "VariableName")
    return {type: "expression", from: node.from}
  let word = context.matchBefore(/[\w\u00c0-\uffff]+$/)
  if (word) return {type: "expression", from: word.from}
  if (context.explicit && node.name != "CommentText" && node.name != "StringLiteral" &&
      node.name != "NumberLiteral" && node.name != "InlineComment")
    return {type: "expression"}
  return null
}

/// Configuration options to
/// [`liquidCompletionSource`](#lang-liquid.liquidCompletionSource).
export type LiquidCompletionConfig = {
  /// Adds additional completions when completing a Liquid tag.
  tags?: readonly Completion[],
  /// Add additional filter completions.
  filters?: readonly Completion[],
  /// Add variable completions.
  variables?: readonly Completion[],
  /// Provides completions for properties completed under the given
  /// path. For example, when completing `user.address.`, `path` will
  /// be `["user", "address"]`.
  properties?: (path: readonly string[], state: EditorState, context: CompletionContext) => readonly Completion[]
}

function resolveProperties(state: EditorState, node: SyntaxNode, context: CompletionContext,
                           properties?: (path: readonly string[], state: EditorState, context: CompletionContext) => readonly Completion[]) {
  let path = []
  for (;;) {
    let obj = node.getChild("Expression")
    if (!obj) return []
    if (obj.name == "forloop") {
      return path.length ? [] : forloop
    } else if (obj.name == "tablerowloop") {
      return path.length ? [] : tablerowloop
    } else if (obj.name == "VariableName") {
      path.unshift(state.sliceDoc(obj.from, obj.to))
      break
    } else if (obj.name == "MemberExpression") {
      let name = obj.getChild("PropertyName")
      if (name) path.unshift(state.sliceDoc(name.from, name.to))
      node = obj
    } else {
      return []
    }
  }
  return properties ? properties(path, state, context) : []
}

/// Returns a completion source for liquid templates. Optionally takes
/// a configuration that adds additional custom completions.
export function liquidCompletionSource(config: LiquidCompletionConfig = {}) {
  let filters = config.filters ? config.filters.concat(Filters) : Filters
  let tags = config.tags ? config.tags.concat(Tags) : Tags
  let exprs = config.variables ? config.variables.concat(Expressions) : Expressions
  let {properties} = config
  return (context: CompletionContext): CompletionResult | null => {
    let cx = findContext(context)
    if (!cx) return null
    let from = cx.from ?? (cx.node ? cx.node.from : context.pos)
    let options
    if (cx.type == "filter") options = filters
    else if (cx.type == "tag") options = tags
    else if (cx.type == "expression") options = exprs
    else /* property */ options = resolveProperties(context.state, cx.target!, context, properties)
    return options.length ? {options, from, validFor: /^[\w\u00c0-\uffff]*$/} : null
  }
}

/// This extension will, when the user types a `%` between two
/// matching braces, insert two percent signs instead and put the
/// cursor between them.
export const closePercentBrace = EditorView.inputHandler.of((view, from, to, text) => {
  if (text != "%" || from != to || view.state.doc.sliceString(from - 1, to + 1) != "{}")
    return false
  view.dispatch(view.state.changeByRange(range => ({
    changes: {from: range.from, to: range.to, insert: "%%"},
    range: EditorSelection.cursor(range.from + 1)
  })), {
    scrollIntoView: true,
    userEvent: "input.type"
  })
  return true
})
