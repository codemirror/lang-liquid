<!-- NOTE: README.md is generated from src/README.md -->

# @codemirror/lang-liquid [![NPM version](https://img.shields.io/npm/v/@codemirror/lang-liquid.svg)](https://www.npmjs.org/package/@codemirror/lang-liquid)

[ [**WEBSITE**](https://codemirror.net/) | [**ISSUES**](https://github.com/codemirror/dev/issues) | [**FORUM**](https://discuss.codemirror.net/c/next/) | [**CHANGELOG**](https://github.com/codemirror/lang-liquid/blob/main/CHANGELOG.md) ]

This package implements [Liquid
template](https://shopify.github.io/liquid/) support for the
[CodeMirror](https://codemirror.net/) code editor.

The [project page](https://codemirror.net/) has more information, a
number of [examples](https://codemirror.net/examples/) and the
[documentation](https://codemirror.net/docs/).

This code is released under an
[MIT license](https://github.com/codemirror/lang-json/tree/main/LICENSE).

We aim to be an inclusive, welcoming community. To make that explicit,
we have a [code of
conduct](http://contributor-covenant.org/version/1/1/0/) that applies
to communication around the project.

## Usage

```javascript
import {EditorView, basicSetup} from "codemirror"
import {liquid} from "@codemirror/lang-liquid"

const view = new EditorView({
  parent: document.body,
  doc: `{% if a.active %}{{ a.title }}{% endif %}`,
  extensions: [basicSetup, liquid()]
})
```

## API Reference

@liquid

@liquidLanguage

@LiquidCompletionConfig

@liquidCompletionSource

@closePercentBrace