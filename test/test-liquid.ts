import {liquidLanguage} from "../dist/index.js"
import {testTree} from "@lezer/generator/dist/test"
import {ParserConfig} from "@lezer/lr"

let parser = liquidLanguage.parser

function test(name: string, code: string, tree: string, options?: ParserConfig) {
  it(name, () => testTree((options ? parser.configure(options) : parser).parse(code.trim()), tree))
}

describe("Liquid parsing", () => {
  test("Interpolation", `One {{ page.title }}`,
       "Template(Text, Interpolation(MemberExpression(VariableName, PropertyName)))")

  test("Filters", `{{ "adam!" | capitalize | prepend: "Hello " }}`,
       "Template(Interpolation(StringLiteral, Filter(FilterName), Filter(FilterName, StringLiteral)))")

  test("Unknown tag", "{% blah 88 %}",
       "Template(Tag(TagName, NumberLiteral))")

  test("If", `
{% if customer.name == "kevin" %}
  Hey Kevin!
{% elsif customer.name != "anonymous" %}
  Hey you!
{% else %}
  Hi Stranger!
{% endif %}
`, `
Template(
  IfDirective(
    Tag(if, BinaryExpression(MemberExpression(VariableName, PropertyName), CompareOp, StringLiteral)),
    Text,
    Tag(elsif, BinaryExpression(MemberExpression(VariableName, PropertyName), CompareOp, StringLiteral)),
    Text,
    Tag(else),
    Text,
    EndTag(endif)))
`)

  test("Operators", `{% if x < 10 and y >= z or a contains b %}{% endif %}`, `
Template(IfDirective(
  Tag(if,
    BinaryExpression(
      BinaryExpression(VariableName,CompareOp,NumberLiteral),
      LogicOp,
      BinaryExpression(
        BinaryExpression(VariableName,CompareOp,VariableName),
        LogicOp,
        BinaryExpression(VariableName,contains,VariableName)))),
  EndTag(endif)))
`)

  test("Booleans", `{% if true or false == empty %}{% endif %}`, `
Template(IfDirective(
  Tag(if, BinaryExpression(BooleanLiteral, LogicOp, BinaryExpression(BooleanLiteral, CompareOp, empty))),
  EndTag(endif)))
`)

  test("Whitespace control", `{%- echo 22 -%}`,
       "Template(Tag(echo, NumberLiteral))")

   test("Case", `
{% case handle %}
  {% when "cake" %}
     This is a cake
  {% when "cookie", "biscuit" %}
     This is a cookie
  {% else %}
     This is not a cake nor a cookie
{% endcase %}
`, `
Template(CaseDirective(
  Tag(case,VariableName),
  Text,
  Tag(when,StringLiteral),
  Text,
  Tag(when,StringLiteral,StringLiteral),
  Text,
  Tag(else),
  Text,
  EndTag(endcase)))
`)

  test("For", `
{% for item in array limit: 3 offset: continue %}
  {{ item }}
  {% break %}
  {% continue %}
{% endfor %}
`, `
Template(ForDirective(
  Tag(for,VariableName,in,VariableName,Parameter(ParameterName,":",NumberLiteral),Parameter(ParameterName,":",continue)),
  Text, Interpolation(VariableName), Text,
  Tag(break), Text,
  Tag(continue), Text,
  EndTag(endfor)))
`)

  test("Range", `{% assign range = (1..num) %}`,
       "Template(Tag(assign, AssignmentExpression(VariableName, AssignOp, RangeExpression(NumberLiteral, VariableName))))")

  test("Cycle", `
{% cycle "one", "two", "three" %}
{% cycle "first": "one", "two", "three" %}
`, `
Template(
  Tag(cycle, StringLiteral, StringLiteral, StringLiteral),
  Text,
  Tag(cycle,StringLiteral, StringLiteral, StringLiteral, StringLiteral))
`)

  test("Tablerow", `
{% tablerow product in collection.products cols:2 offset:3 %}
  {{ product.title }}
{% endtablerow %}
`, `
Template(TableDirective(
  Tag(tablerow, VariableName, in,
    MemberExpression(VariableName, PropertyName),
    Parameter(ParameterName, NumberLiteral),
    Parameter(ParameterName, NumberLiteral)),
  Text,
  Interpolation(MemberExpression(VariableName, PropertyName)),
  Text,
  EndTag(endtablerow)))
`)

  test("Comment", `
{% comment %}
{% assign verb = "converted" %}
{% endcomment %}
`, `Template(Comment(Tag(comment), CommentText, EndTag(endcomment)))`)

  test("Inline comment", `
{%
  ###############################
  # This is a comment
  # across multiple lines
  ###############################
%}
{% # What?
  if true %}100{%
 # No?
endif
 # Ok
%}
`, `
Template(
  Tag(InlineComment,InlineComment,InlineComment,InlineComment), Text,
  IfDirective(Tag(InlineComment, if, BooleanLiteral), Text, EndTag(InlineComment, endif, InlineComment)))
`)

  test("Raw", `
{% raw %}
In Handlebars, {{ this }} will be HTML-escaped, but {{{ that }}} will not.
{% endraw %}
`, `
Template(RawDirective(Tag(raw), RawText, EndTag(endraw)))
`)

  test("Render", `
{% render "name", my_variable: my_variable, my_other_variable: "oranges" %}
{% render "product" with featured_product as product %}
`, `
Template(
  Tag(render, StringLiteral,
    RenderParameter(VariableName, VariableName),
    RenderParameter(VariableName, StringLiteral)),
  Text,
  Tag(render, StringLiteral, RenderParameter(with, VariableName, as, VariableName)))
`)

  test("Liquid", `
{% liquid
case section.blocks.size
when 1
  assign column_size = ''
when 2
  assign column_size = 'one-half'
when 3
  assign column_size = 'one-third'
else
  assign column_size = 'one-quarter'
endcase %}
`, `
Template(Tag(liquid,
  CaseDirective(
    Tag(case,MemberExpression(MemberExpression(VariableName,".",PropertyName),".",PropertyName)),
    Tag(when,NumberLiteral),
      Tag(assign,AssignmentExpression(VariableName,AssignOp,StringLiteral)),
    Tag(when,NumberLiteral),
      Tag(assign,AssignmentExpression(VariableName,AssignOp,StringLiteral)),
    Tag(when,NumberLiteral),
      Tag(assign,AssignmentExpression(VariableName,AssignOp,StringLiteral)),
    Tag(else),
      Tag(assign,AssignmentExpression(VariableName,AssignOp,StringLiteral)),
    EndTag(endcase))))
`)

  test("Assign with filter", `{% assign zeroFillSize = zeroFill | size %}`,
       `Template(Tag(assign,AssignmentExpression(VariableName,AssignOp,VariableName),Filter(FilterName)))`)
})
