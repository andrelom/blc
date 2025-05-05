# BLC - Broken Link Checker

**BLC** is a lightweight broken link checker built with Node.js.

It crawls all reachable internal pages and logs the HTTP status of each link, writing a full report to `report.txt`.

---

## Features

- Detects broken internal links (4xx/5xx).
- Recursively crawls the site starting from a base URL.
- Configurable concurrency for faster scanning.
- Generates a `report.txt` log file with results.

---

## Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/andrelom/blc.git

cd blc

npm install
```

## Usage

Basic usage:

```bash
node index.js --url "https://example.org"
```

With custom concurrency:

```bash
node index.js --url "https://example.org" --concurrency 4
```

Or using shorthand flags:

```bash
node index.js -u "https://example.org" -c 4
```

## Options

| Option          | Alias | Type     | Description                                    | Default |
| --------------- | ----- | -------- | ---------------------------------------------- | ------- |
| `--url`         | `-u`  | `string` | **(Required)** Base URL to start crawling from |         |
| `--concurrency` | `-c`  | `number` | Number of concurrent requests to make          | `4`     |
| `--help`        |       |          | Show help menu                                 |         |
| `--version`     |       |          | Show version number                            |         |

---

## Output

Results are logged to both the console and a `report.txt` file in the root directory.

- ✅ Valid URLs are marked with HTTP status `200`
- ❌ Broken links display error code and referring page

Example:

```
Broken Link Report for https://example.org/

✅  [200] https://example.org
❌  [404] https://example.org/broken-link (linked from: https://example.org/about)
✅  [301] https://example.org/redirect

✅ Scan completed. 57 pages visited.

```

## License

MIT
