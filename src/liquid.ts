import {Language, LRLanguage, LanguageSupport, foldNodeProp,
        indentNodeProp, delimitedIndent, TreeIndentContext} from "@codemirror/language"
import {html} from "@codemirror/lang-html"
import {styleTags, tags as t} from "@lezer/highlight"
import {parseMixed} from "@lezer/common"
import {parser} from "./liquid.grammar"
import {liquidCompletionSource, LiquidCompletionConfig, closePercentBrace} from "./complete"
export {liquidCompletionSource, LiquidCompletionConfig, closePercentBrace}

function directiveIndent(except: RegExp) {
  return (context: TreeIndentContext) => {
    let back = except.test(context.textAfter)
    return context.lineIndent(context.node.from) + (back ? 0 : context.unit)
  }
}

const tagLanguage = LRLanguage.define({
  name: "liquid",
  parser: parser.configure({
    props: [
      styleTags({
        "cycle comment endcomment raw endraw echo increment decrement liquid in with as": t.keyword,
        "empty forloop tablerowloop": t.atom,
        "if elsif else endif unless endunless case endcase for endfor tablerow endtablerow break continue": t.controlKeyword,
        "assign capture endcapture": t.definitionKeyword,
        "contains": t.operatorKeyword,
        "render include": t.moduleKeyword,
        VariableName: t.variableName,
        TagName: t.tagName,
        FilterName: t.function(t.variableName),
        PropertyName: t.propertyName,
        CompareOp: t.compareOperator,
        AssignOp: t.definitionOperator,
        LogicOp: t.logicOperator,
        NumberLiteral: t.number,
        StringLiteral: t.string,
        BooleanLiteral: t.bool,
        InlineComment: t.lineComment,
        CommentText: t.blockComment,
        "{% %} {{ }}": t.brace,
        "( )": t.paren,
        ".": t.derefOperator,
        ", .. : |": t.punctuation
      }),
      indentNodeProp.add({
        Tag: delimitedIndent({closing: "%}"}),
        "UnlessDirective ForDirective TablerowDirective CaptureDirective":
          directiveIndent(/^\s*(\{%-?\s*)?end\w/),
        IfDirective: directiveIndent(/^\s*(\{%-?\s*)?(endif|else|elsif)\b/),
        CaseDirective: directiveIndent(/^\s*(\{%-?\s*)?(endcase|when)\b/),
      }),
      foldNodeProp.add({
        "UnlessDirective ForDirective TablerowDirective CaptureDirective IfDirective CaseDirective RawDirective Comment"(tree) {
          let first = tree.firstChild, last = tree.lastChild!
          if (!first || first.name != "Tag") return null
          return {from: first.to, to: last.name == "EndTag" ? last.from : tree.to}
        }
      })
    ]
  }),
  languageData: {
    commentTokens: {line: "#"},
    indentOnInput: /^\s*{%-?\s*(?:end|elsif|else|when|)$/
  }
})

const baseHTML = html()

function makeLiquid(base: Language) {
  return tagLanguage.configure({
    wrap: parseMixed(node => node.type.isTop ? {
      parser: base.parser,
      overlay: n => n.name == "Text" || n.name == "RawText"
    } : null)
  }, "liquid")
}

/// A language provider for Liquid templates.
export const liquidLanguage = makeLiquid(baseHTML.language)

/// Liquid template support.
export function liquid(config: LiquidCompletionConfig & {
  /// Provide an HTML language configuration to use as a base.
  base?: LanguageSupport
} = {}) {
  let base = config.base || baseHTML
  let lang = base.language == baseHTML.language ? liquidLanguage : makeLiquid(base.language)
  return new LanguageSupport(lang, [
    base.support,
    lang.data.of({autocomplete: liquidCompletionSource(config)}),
    base.language.data.of({closeBrackets: {brackets: ["{"]}}),
    closePercentBrace
  ])
}
