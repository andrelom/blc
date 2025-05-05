const fs = require('node:fs')
const path = require('node:path')

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const axios = require('axios')
const cheerio = require('cheerio')
const useragent = require('random-useragent')

// Command-line argument parsing using yargs.
const { argv } = yargs(hideBin(process.argv))
  .version('1.0.0')
  .help()
  .option('url', {
    demandOption: true,
    type: 'string',
    alias: 'u',
    describe: 'Base URL to start crawling from',
  })
  .option('concurrency', {
    demandOption: false,
    type: 'number',
    alias: 'c',
    describe: 'Number of concurrent requests to make',
    default: 4,
  })

// Base URL to start crawling from.
const BASE_URL = argv.url

// Number of pages to fetch in parallel.
const CONCURRENCY = argv.concurrency

// Path to output report file.
const LOG_FILE_PATH = path.join(__dirname, 'report.txt')

const visited = new Set()
const queued = new Set()
const queue = [{ visiting: BASE_URL, referring: null }]

// Initialize the report file.
fs.writeFileSync(LOG_FILE_PATH, `Broken Link Report for ${BASE_URL}\n\n`)

/**
 * Logs a message to both the console and the report file.
 *
 * @param {string} message - The message to log.
 */
function log(message) {
  console.log(message)

  fs.appendFileSync(LOG_FILE_PATH, message + '\n')
}

/**
 * Checks whether a given URL is internal
 * to the BASE_URL domain.
 *
 * @param {string} url - The URL to check.
 * @returns {boolean} True if internal, otherwise false.
 */
function isInternalLink(url) {
  try {
    const base = new URL(BASE_URL)
    const link = new URL(url, BASE_URL)

    return link.hostname === base.hostname
  } catch {
    return false
  }
}

/**
 * Normalizes a URL to an absolute format and strips
 * fragment identifiers and trailing slashes (except for root).
 *
 * @param {string} value - The URL to normalize.
 * @returns {string|null} Normalized absolute URL or null if invalid.
 */
function normalize(value) {
  try {
    const url = new URL(value, BASE_URL)

    // Remove fragment identifier (hash) and query parameters.
    url.hash = ''

    // Normalize pathname: remove trailing slash unless it's root "/".
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1)
    }

    return url.href
  } catch {
    return null
  }
}

/**
 * Extracts and normalizes all internal anchor links
 * from a given HTML document.
 *
 * @param {string} html - The HTML content of the page.
 * @returns {string[]} Array of internal absolute URLs.
 */
function extract(html) {
  const $ = cheerio.load(html)
  const links = new Set()

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href')
    const link = normalize(href)

    if (link && isInternalLink(link)) {
      links.add(link)
    }
  })

  return Array.from(links)
}

/**
 * Attempts to fetch a URL and logs its HTTP status.
 *
 * @param {string} url - The URL to request.
 * @param {string} [referring] - The referring page where the link was found.
 * @returns {Promise<string|null>} HTML content if successful, otherwise null.
 */
async function fetch(url, referring = null) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': useragent.getRandom(),
      },
    })

    log(`✅  [${response.status}] ${url}`)

    return response.data
  } catch (error) {
    const status = error.response?.status || 'ERROR'
    const note = referring ? ` (linked from: ${referring})` : ''

    log(`❌  [${status}] ${url}${note}`)

    return null
  }
}

/**
 * Core crawler loop that performs a breadth-first
 * traversal of internal links.
 */
async function crawl() {
  while (queue.length > 0) {
    const batch = []

    // Fill the batch with URLs to fetch, respecting concurrency.
    while (batch.length < CONCURRENCY && queue.length > 0) {
      const { visiting, referring } = queue.shift()

      // If the URL has already been visited, skip it.
      if (!visited.has(visiting.toLowerCase())) {
        // Add the URL to the visited set.
        visited.add(visiting.toLowerCase())

        // Normalize the URL and check if it's valid.
        batch.push({ visiting, referring })
      }
    }

    await Promise.all(
      batch.map(async ({ visiting, referring }) => {
        const html = await fetch(visiting, referring)

        if (!html) return

        const links = extract(html)

        // Loop through each link found in the HTML and
        // add it to the queue if it hasn't been visited or queued.
        for (const link of links) {
          const normalized = link.toLowerCase()

          // If the link has not been visited or queued,
          // add it to the queue for further processing.
          if (!visited.has(normalized) && !queued.has(normalized)) {
            // Add the link to the visited set.
            queued.add(normalized)

            // Push the link to the queue for further processing.
            queue.push({ visiting: link, referring: visiting })
          }
        }
      }),
    )
  }
}

// Start the crawling process and handle
// unexpected errors.
crawl()
  .then(() => log(`\n✅ Scan completed. ${visited.size} pages visited.`))
  .catch((error) => log(`❌ Unexpected error: ${error.message}`))
