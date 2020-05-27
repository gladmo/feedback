# feedback
Feedback tool similar to Google's.

This is a very early alpha version, with a couple of [known issues](#known-issues), a complete rewrite. Should be more performant and less buggy (hopefully).

### Installing

```
npm i gladmo/feedback
```

### Usage

Import and create an instance of `Feedback`:
```ts
import { Feedback } from '@ivoviz/feedback.js';
.
.
.
const feedback = new Feedback();
feedback.open();
```

At the moment only two functions are exposed: `open` and `close`, although the latter shouldn't be needed.

Import the stylesheet:

```scss
import "gladmo/feedback/dist/lib/feedback.css";
```

There are two optional parameters, `FeedbackOptions` and `HTML2CanvasOptions`.

Currently, the only options supported by `FeedbackOptions` are:

`endpoint`: The url where you want to post the form data. The data will be sent as `json`:

```json
{
  "description": "some text",
  "screenshot": "base64 png"
}
```

`allowedTags` _(optional)_: A string array containing the name of the nodes you want to be able to be highlighted on mouseover.

You can read about `HTML2CanvasOptions` here: http://html2canvas.hertzen.com/configuration.

### Known issues

- Missing tooltips for buttons
- Missing loading animations while sending data or creating screenshot
- Missing icons
- Default texts should be written appropriately
- Not many options at the moment

### Build instructions

    # Install (dev) dependencies
    npm install
    
    # Build Javascript files from TypeScript
    ./node_modules/.bin/tsc
    
    # Build css from sass
    ./node_modules/.bin/node-sass lib/feedback.scss dist/lib/feedback.css
