# Async Lines

Get an async iterator over lines in a stream.

## Installation

```sh
npm install --save async-lines
```

## Usage

```js
const fs = require('fs')
const asyncLines = require('async-lines')

// Print current file to stdout
const stream = fs.createReadStream(__filename)

for await (const line of asyncLines(stream)) {
  console.log(line)
}
```

## API

### `asyncLines(stream: Readable) => AsyncIterableIterator<string>`

Returns a new async iterator that iterates over all the lines in the stream.
