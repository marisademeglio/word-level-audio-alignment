# About this demo

View it live

## What it is

* "The Raven" by Edgar Allen Poe, narrated by FergusRossFerrier
* This self-contained synchronized presentation runs in a standard browser 
* It was made with very little javascript and is not a heavy custom application, it's a declarative multimedia document
* Features include word-level audio synchronization, and next/previous navigation of words, lines, and stanzas

## What it's made out of

* HTML
* CSS
* WebVTT (of track kind ["metadata"](https://www.w3.org/TR/webvtt1/#introduction-metadata))
* [CSS Highlights API](https://www.w3.org/TR/css-highlight-api-1/)
* Javascript

## Where it runs
Right now, [probably just Chrome](https://caniuse.com/mdn-api_highlight_has)

## Wishlist (tech does not exist yet)

* Animated highlights (no animation properties are available for ::highlight pseudo-elements though)
* Screen-reader synchronicity (switch from narration to screenreader and don't lose your place)
* Having more than one VTT track of kind `metadata` firing events at the same time (could easily do layered highlighting)

## Wishlist of work for me to do to this demo

* page-wide keyboard commands 
* user control over highlight options

## Layering highlights

The problem is that if you have multiple metadata tracks on a media element, only the one marked 'default' is active. So even if you have your different tracks set up each with a different kind of highlight (e.g. words, lines, stanzas), you can only have one active at a time.

See the examples in this folder for different approaches to layering highlights. The approach in `raven-layered-highlight.html` is probably the most viable, with all the cues in one file. By using additional cue metadata to categorize the cue as 'word', 'line', or 'stanza', the UI can offer checkboxes for the user to enable/disable each type of cue. 

