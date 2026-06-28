# screenshotapi-to

Official JavaScript and TypeScript SDK for [ScreenshotAPI][home]. Capture website screenshots from Node.js, Next.js, Vercel, Cloudflare Workers, Bun, and other runtimes with native `fetch`.

## Install

```bash
npm install screenshotapi-to
```

```bash
bun add screenshotapi-to
```

```bash
pnpm add screenshotapi-to
```

```bash
yarn add screenshotapi-to
```

## Authentication

Create an API key in the [ScreenshotAPI dashboard][dashboard], then keep it in a server-side environment variable.

```bash
export SCREENSHOTAPI_KEY="sk_live_your_key_here"
```

```typescript
import { ScreenshotAPI } from 'screenshotapi-to'

const client = new ScreenshotAPI({
	apiKey: process.env.SCREENSHOTAPI_KEY!
})
```

Never expose your API key in browser JavaScript. For browser apps, call your own backend route and let that route use this SDK.

## First Screenshot

Capture `https://example.com`, save it to disk, and inspect the response metadata.

```typescript
import { ScreenshotAPI } from 'screenshotapi-to'

const client = new ScreenshotAPI({
	apiKey: process.env.SCREENSHOTAPI_KEY!
})

const metadata = await client.save({
	url: 'https://example.com',
	path: './example.png',
	type: 'png'
})

console.log(`Screenshot ID: ${metadata.screenshotId}`)
console.log(`Credits remaining: ${metadata.creditsRemaining}`)
```

To work with raw image bytes instead of saving a file:

```typescript
const result = await client.screenshot({
	url: 'https://example.com',
	type: 'webp',
	quality: 85
})

console.log(result.contentType)
console.log(result.image.byteLength)
```

## Advanced Options

```typescript
const result = await client.screenshot({
	url: 'https://example.com/dashboard',
	width: 1440,
	height: 1200,
	fullPage: true,
	type: 'webp',
	quality: 90,
	colorScheme: 'dark',
	waitUntil: 'networkidle0',
	waitForSelector: '[data-ready="true"]',
	delay: 500,
	blockAds: true,
	removeCookieBanners: true,
	devicePixelRatio: 2,
	timezone: 'America/New_York',
	locale: 'en-US',
	cacheTtl: 300,
	removeElements: ['.modal', '#promo'],
	mockupDevice: 'browser',
	geoLocation: {
		latitude: 40.7128,
		longitude: -74.006,
		accuracy: 25
	}
})
```

For HTML rendering, pass `html`. The SDK automatically switches to `POST /api/v1/screenshot`.

```typescript
const pdf = await client.screenshot({
	html: '<main><h1>Invoice</h1></main>',
	type: 'pdf',
	width: 1200
})
```

| Option                  | Type                                             | Default          | Description                  |
| ----------------------- | ------------------------------------------------ | ---------------- | ---------------------------- |
| `url`                   | `string`                                         | Required unless `html` is set | URL to capture |
| `html`                  | `string`                                         | None             | HTML document to render via POST |
| `width`                 | `number`                                         | API default      | Viewport width in pixels     |
| `height`                | `number`                                         | API default      | Viewport height in pixels    |
| `fullPage`              | `boolean`                                        | `false`          | Capture the full page        |
| `type`                  | `'png' \| 'jpeg' \| 'webp' \| 'pdf'`             | `'png'`          | Output format                |
| `quality`               | `number`                                         | `100`            | JPEG/WebP quality, 1-100     |
| `colorScheme`           | `'light' \| 'dark'`                              | Page default     | Preferred color scheme       |
| `waitUntil`             | `'load' \| 'domcontentloaded' \| 'networkidle0' \| 'networkidle2'` | `networkidle2` | Page readiness signal |
| `waitForSelector`       | `string`                                         | None             | CSS selector to wait for     |
| `delay`                 | `number`                                         | None             | Extra wait after page load   |
| `blockAds`              | `boolean`                                        | `false`          | Block common ad network requests |
| `removeCookieBanners`   | `boolean`                                        | `false`          | Attempt to remove cookie banners |
| `cssInject`             | `string`                                         | None             | CSS injected before capture  |
| `jsInject`              | `string`                                         | None             | JavaScript evaluated before capture |
| `stealthMode`           | `boolean`                                        | `false`          | Enable bot-evasion browser settings |
| `devicePixelRatio`      | `1 \| 2 \| 3`                                    | `1`              | Device pixel ratio           |
| `timezone`              | `string`                                         | Server default   | IANA timezone                |
| `locale`                | `string`                                         | Server default   | BCP 47 locale                |
| `cacheTtl`              | `number`                                         | None             | Cache TTL in seconds         |
| `preloadFonts`          | `boolean`                                        | `false`          | Preload fonts before capture |
| `removeElements`        | `string[]`                                       | None             | CSS selectors to remove      |
| `removePopups`          | `boolean`                                        | `false`          | Attempt to close popups      |
| `mockupDevice`          | `'browser' \| 'iphone' \| 'macbook'`             | None             | Wrap screenshot in a device mockup |
| `geoLocation`           | `{ latitude: number; longitude: number; accuracy?: number }` | None | Browser geolocation emulation |

## Error Handling

The SDK throws typed errors for API, network, and timeout failures.

```typescript
import {
	AuthenticationError,
	InsufficientCreditsError,
	InvalidAPIKeyError,
	ScreenshotAPI,
	ScreenshotFailedError,
	ScreenshotNetworkError,
	ScreenshotTimeoutError
} from 'screenshotapi-to'

const client = new ScreenshotAPI({
	apiKey: process.env.SCREENSHOTAPI_KEY!,
	timeout: 30_000
})

try {
	await client.screenshot({ url: 'https://example.com' })
} catch (error) {
	if (error instanceof AuthenticationError) {
		console.error('Missing or malformed API key')
	} else if (error instanceof InvalidAPIKeyError) {
		console.error('API key is revoked or invalid')
	} else if (error instanceof InsufficientCreditsError) {
		console.error(`No credits remaining. Balance: ${error.balance}`)
	} else if (error instanceof ScreenshotFailedError) {
		console.error(`Capture failed: ${error.message}`)
	} else if (error instanceof ScreenshotTimeoutError) {
		console.error(`Timed out after ${error.timeoutMs}ms`)
	} else if (error instanceof ScreenshotNetworkError) {
		console.error('Could not reach ScreenshotAPI')
	} else {
		throw error
	}
}
```

## Runtime Examples

Examples are included in this package:

- [Node.js](./examples/node.js)
- [Next.js App Router](./examples/nextjs-route.ts)
- [Vercel Function](./examples/vercel-function.ts)
- [Cloudflare Worker](./examples/cloudflare-worker.ts)

## API Reference

### `new ScreenshotAPI(config)`

| Parameter | Type     | Required | Default                     | Description          |
| --------- | -------- | -------- | --------------------------- | -------------------- |
| `apiKey`  | `string` | Yes      | None                        | Your API key         |
| `baseUrl` | `string` | No       | `https://screenshotapi.to`  | API base URL         |
| `timeout` | `number` | No       | `60000`                     | Request timeout (ms) |

### `client.screenshot(options)`

Returns `Promise<ScreenshotResult>`.

```typescript
interface ScreenshotResult {
	image: ArrayBuffer
	metadata: ScreenshotMetadata
	contentType: string
}
```

### `client.save(options)`

Same options as `screenshot()` plus `path: string`. Returns `Promise<ScreenshotMetadata>`.

`save()` writes with Node.js file APIs and is only available in Node-compatible runtimes. Use `screenshot()` in edge runtimes and return or store the `ArrayBuffer` yourself.

## Pricing, Docs, and Support

ScreenshotAPI includes [200 free screenshots per month][pricing]. No credit card is required for the free tier.

- Full JavaScript SDK docs: [screenshotapi.to/docs/sdks/javascript][sdk-docs]
- Screenshot API parameter reference: [screenshotapi.to/docs/api/screenshot][api-docs]
- Pricing and free tier: [screenshotapi.to/pricing][pricing]
- Support: [support@screenshotapi.to][support]

## Requirements

- Node.js 18+ for Node runtimes
- Native `fetch`
- Zero runtime dependencies

## License

MIT

[home]: https://screenshotapi.to?utm_source=npm&utm_medium=sdk&utm_campaign=javascript_sdk&ref=javascript-sdk
[dashboard]: https://screenshotapi.to/dashboard?utm_source=npm&utm_medium=sdk&utm_campaign=javascript_sdk&ref=javascript-sdk
[sdk-docs]: https://screenshotapi.to/docs/sdks/javascript?utm_source=npm&utm_medium=sdk&utm_campaign=javascript_sdk&ref=javascript-sdk
[api-docs]: https://screenshotapi.to/docs/api/screenshot?utm_source=npm&utm_medium=sdk&utm_campaign=javascript_sdk&ref=javascript-sdk
[pricing]: https://screenshotapi.to/pricing?utm_source=npm&utm_medium=sdk&utm_campaign=javascript_sdk&ref=javascript-sdk
[support]: mailto:support@screenshotapi.to?subject=JavaScript%20SDK%20support
