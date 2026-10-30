# The Weekend Critic

A movie-review aggregator that reads like a print magazine.

**[Read the issue →](https://weekendcritic.com/)**

<img src="demo.gif" alt="Demo of The Weekend Critic" />

## Features

- Turn pages by dragging, swiping or using the arrow keys
- Zoom in with a pinch, a double tap or the zoom controls
- Long reviews continue on the next page, so nothing scrolls
- Choose the desk the magazine lies on

## Development

```
nvm use
npm install
npx playwright install   # browsers for the browser tests

npm run dev        # dev server
npm run check      # format, types, lint
npm run test:all   # unit tests, then browser tests
npm run build      # type-check, build for production, prerender every article
```
