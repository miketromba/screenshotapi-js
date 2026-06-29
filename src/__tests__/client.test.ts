import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ScreenshotAPI } from '../client'
import {
	AuthenticationError,
	InsufficientCreditsError,
	InvalidAPIKeyError,
	ScreenshotAPIError,
	ScreenshotFailedError,
	ScreenshotNetworkError,
	ScreenshotTimeoutError
} from '../errors'

const TEST_KEY = 'sk_test_abc123'

const originalFetch = globalThis.fetch

function mockFetch(
	handler: (url: string, init?: RequestInit) => Response | Promise<Response>
) {
	globalThis.fetch = mock(handler) as unknown as typeof fetch
}

function fetchMock() {
	return (globalThis.fetch as unknown as ReturnType<typeof mock>).mock
}

function successResponse(opts?: {
	contentType?: string
	creditsRemaining?: number
	screenshotId?: string
	durationMs?: number
}): Response {
	const headers = new Headers({
		'content-type': opts?.contentType ?? 'image/png',
		'x-credits-remaining': String(opts?.creditsRemaining ?? 950),
		'x-screenshot-id': opts?.screenshotId ?? 'ss_abc',
		'x-duration-ms': String(opts?.durationMs ?? 1234)
	})
	return new Response(new ArrayBuffer(64), { status: 200, headers })
}

function errorResponse(
	status: number,
	body: Record<string, unknown>
): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	})
}

beforeEach(() => {
	globalThis.fetch = originalFetch
})

afterEach(() => {
	globalThis.fetch = originalFetch
})

// ─── Constructor ────────────────────────────────────────────────────

describe('constructor', () => {
	test('throws if no apiKey provided', () => {
		expect(() => new ScreenshotAPI({ apiKey: '' })).toThrow(
			'API key is required'
		)
	})

	test('sets default baseUrl to https://screenshotapi.to', async () => {
		mockFetch(() => successResponse())
		const client = new ScreenshotAPI({ apiKey: TEST_KEY })
		await client.screenshot({ url: 'https://example.com' })
		const calledUrl = fetchMock().calls[0][0] as string
		expect(calledUrl).toStartWith('https://screenshotapi.to/')
	})

	test('strips trailing slashes from baseUrl', async () => {
		mockFetch(() => successResponse())
		const client = new ScreenshotAPI({
			apiKey: TEST_KEY,
			baseUrl: 'https://custom.api///'
		})
		await client.screenshot({ url: 'https://example.com' })
		const calledUrl = fetchMock().calls[0][0] as string
		expect(calledUrl).toStartWith('https://custom.api/api/v1/screenshot')
	})

	test('uses custom baseUrl when provided', async () => {
		mockFetch(() => successResponse())
		const client = new ScreenshotAPI({
			apiKey: TEST_KEY,
			baseUrl: 'https://my-proxy.internal'
		})
		await client.screenshot({ url: 'https://example.com' })
		const calledUrl = fetchMock().calls[0][0] as string
		expect(calledUrl).toStartWith(
			'https://my-proxy.internal/api/v1/screenshot'
		)
	})

	test('sets default timeout to 60000', async () => {
		let signalUsed: AbortSignal | undefined
		mockFetch((_url, init) => {
			signalUsed = init?.signal as AbortSignal | undefined
			return successResponse()
		})
		const client = new ScreenshotAPI({ apiKey: TEST_KEY })
		await client.screenshot({ url: 'https://example.com' })
		expect(signalUsed).toBeDefined()
		expect(signalUsed?.aborted).toBe(false)
	})
})

// ─── screenshot() ───────────────────────────────────────────────────

describe('screenshot()', () => {
	test('throws if no url provided', async () => {
		const client = new ScreenshotAPI({ apiKey: TEST_KEY })
		expect(client.screenshot({})).rejects.toThrow('URL or HTML is required')
	})

	test('builds correct URL with all query params', async () => {
		let capturedUrl = ''
		mockFetch(url => {
			capturedUrl = url
			return successResponse()
		})

		const client = new ScreenshotAPI({ apiKey: TEST_KEY })
		await client.screenshot({
			url: 'https://example.com',
			width: 1280,
			height: 720,
			fullPage: true,
			type: 'jpeg',
			quality: 80,
			colorScheme: 'dark',
			waitUntil: 'networkidle0',
			waitForSelector: '#main',
			delay: 500,
			blockAds: true,
			removeCookieBanners: false,
			cssInject: 'body { background: black; }',
			jsInject: "document.body.dataset.ready = 'true'",
			stealthMode: true,
			devicePixelRatio: 2,
			timezone: 'America/New_York',
			locale: 'en-US',
			cacheTtl: 300,
			preloadFonts: true,
			removeElements: ['.cookie', '#promo'],
			removePopups: true,
			mockupDevice: 'browser',
			geoLocation: {
				latitude: 37.7749,
				longitude: -122.4194,
				accuracy: 25
			}
		})

		const parsed = new URL(capturedUrl)
		expect(parsed.pathname).toBe('/api/v1/screenshot')
		expect(parsed.searchParams.get('url')).toBe('https://example.com')
		expect(parsed.searchParams.get('width')).toBe('1280')
		expect(parsed.searchParams.get('height')).toBe('720')
		expect(parsed.searchParams.get('fullPage')).toBe('true')
		expect(parsed.searchParams.get('type')).toBe('jpeg')
		expect(parsed.searchParams.get('quality')).toBe('80')
		expect(parsed.searchParams.get('colorScheme')).toBe('dark')
		expect(parsed.searchParams.get('waitUntil')).toBe('networkidle0')
		expect(parsed.searchParams.get('waitForSelector')).toBe('#main')
		expect(parsed.searchParams.get('delay')).toBe('500')
		expect(parsed.searchParams.get('blockAds')).toBe('true')
		expect(parsed.searchParams.get('removeCookieBanners')).toBe('false')
		expect(parsed.searchParams.get('cssInject')).toBe(
			'body { background: black; }'
		)
		expect(parsed.searchParams.get('jsInject')).toBe(
			"document.body.dataset.ready = 'true'"
		)
		expect(parsed.searchParams.get('stealthMode')).toBe('true')
		expect(parsed.searchParams.get('devicePixelRatio')).toBe('2')
		expect(parsed.searchParams.get('timezone')).toBe('America/New_York')
		expect(parsed.searchParams.get('locale')).toBe('en-US')
		expect(parsed.searchParams.get('cacheTtl')).toBe('300')
		expect(parsed.searchParams.get('preloadFonts')).toBe('true')
		expect(parsed.searchParams.get('removeElements')).toBe('.cookie,#promo')
		expect(parsed.searchParams.get('removePopups')).toBe('true')
		expect(parsed.searchParams.get('mockupDevice')).toBe('browser')
		expect(parsed.searchParams.get('geoLatitude')).toBe('37.7749')
		expect(parsed.searchParams.get('geoLongitude')).toBe('-122.4194')
		expect(parsed.searchParams.get('geoAccuracy')).toBe('25')
	})

	test('uses POST JSON body for HTML captures', async () => {
		let capturedUrl = ''
		let capturedInit: RequestInit | undefined
		mockFetch((url, init) => {
			capturedUrl = url
			capturedInit = init
			return successResponse({ contentType: 'application/pdf' })
		})

		const client = new ScreenshotAPI({ apiKey: TEST_KEY })
		const result = await client.screenshot({
			html: '<h1>Hello</h1>',
			url: 'https://example.com/base',
			width: 1200,
			type: 'pdf',
			fullPage: false,
			blockAds: true,
			removeCookieBanners: true,
			cssInject: 'body{color:red}',
			jsInject: "document.title='x'",
			devicePixelRatio: 3,
			removeElements: ['.modal', '#banner'],
			geoLocation: { latitude: 0, longitude: 0 }
		})

		expect(capturedUrl).toBe('https://screenshotapi.to/api/v1/screenshot')
		expect(capturedInit?.method).toBe('POST')
		expect(capturedInit?.headers).toEqual({
			'x-api-key': TEST_KEY,
			'content-type': 'application/json'
		})

		const body = JSON.parse(String(capturedInit?.body)) as Record<
			string,
			unknown
		>
		expect(body.url).toBe('https://example.com/base')
		expect(body.html).toBe('<h1>Hello</h1>')
		expect(body.width).toBe(1200)
		expect(body.type).toBe('pdf')
		expect(body.fullPage).toBe(false)
		expect(body.blockAds).toBe(true)
		expect(body.removeCookieBanners).toBe(true)
		expect(body.cssInject).toBe('body{color:red}')
		expect(body.jsInject).toBe("document.title='x'")
		expect(body.devicePixelRatio).toBe(3)
		expect(body.removeElements).toEqual(['.modal', '#banner'])
		expect(body.geoLocation).toEqual({ latitude: 0, longitude: 0 })
		expect(result.contentType).toBe('application/pdf')
	})

	test('omits optional params when not provided', async () => {
		let capturedUrl = ''
		mockFetch(url => {
			capturedUrl = url
			return successResponse()
		})

		const client = new ScreenshotAPI({ apiKey: TEST_KEY })
		await client.screenshot({ url: 'https://example.com' })

		const parsed = new URL(capturedUrl)
		expect(parsed.searchParams.get('url')).toBe('https://example.com')
		expect(parsed.searchParams.has('width')).toBe(false)
		expect(parsed.searchParams.has('height')).toBe(false)
		expect(parsed.searchParams.has('fullPage')).toBe(false)
		expect(parsed.searchParams.has('type')).toBe(false)
		expect(parsed.searchParams.has('quality')).toBe(false)
	})

	test('sends x-api-key header', async () => {
		let capturedHeaders: HeadersInit | undefined
		mockFetch((_url, init) => {
			capturedHeaders = init?.headers
			return successResponse()
		})

		const client = new ScreenshotAPI({ apiKey: TEST_KEY })
		await client.screenshot({ url: 'https://example.com' })

		expect(capturedHeaders).toEqual({ 'x-api-key': TEST_KEY })
	})

	test('returns image buffer, metadata, and contentType on success', async () => {
		mockFetch(() =>
			successResponse({
				contentType: 'image/webp',
				creditsRemaining: 800,
				screenshotId: 'ss_xyz',
				durationMs: 2345
			})
		)

		const client = new ScreenshotAPI({ apiKey: TEST_KEY })
		const result = await client.screenshot({ url: 'https://example.com' })

		expect(result.image).toBeInstanceOf(ArrayBuffer)
		expect(result.image.byteLength).toBe(64)
		expect(result.contentType).toBe('image/webp')
		expect(result.metadata).toEqual({
			creditsRemaining: 800,
			screenshotId: 'ss_xyz',
			durationMs: 2345
		})
	})

	test('defaults contentType to image/png when header missing', async () => {
		const response = new Response(new ArrayBuffer(8), {
			status: 200,
			headers: {
				'x-credits-remaining': '100',
				'x-screenshot-id': 'ss_1',
				'x-duration-ms': '100'
			}
		})
		mockFetch(() => response)

		const client = new ScreenshotAPI({ apiKey: TEST_KEY })
		const result = await client.screenshot({ url: 'https://example.com' })
		expect(result.contentType).toBe('image/png')
	})

	test('defaults metadata fields to 0 / empty when headers missing', async () => {
		const response = new Response(new ArrayBuffer(8), { status: 200 })
		mockFetch(() => response)

		const client = new ScreenshotAPI({ apiKey: TEST_KEY })
		const result = await client.screenshot({ url: 'https://example.com' })
		expect(result.metadata.creditsRemaining).toBe(0)
		expect(result.metadata.screenshotId).toBe('')
		expect(result.metadata.durationMs).toBe(0)
	})

	// ─── Error handling ───────────────────────────────────────────────

	test('handles 401 → AuthenticationError', async () => {
		mockFetch(() => errorResponse(401, { error: 'Invalid authentication' }))

		const client = new ScreenshotAPI({ apiKey: TEST_KEY })
		try {
			await client.screenshot({ url: 'https://example.com' })
			expect.unreachable('should have thrown')
		} catch (err) {
			expect(err).toBeInstanceOf(AuthenticationError)
			expect((err as AuthenticationError).status).toBe(401)
			expect((err as AuthenticationError).code).toBe(
				'authentication_error'
			)
			expect((err as AuthenticationError).message).toBe(
				'Invalid authentication'
			)
		}
	})

	test('handles 402 → InsufficientCreditsError with balance', async () => {
		mockFetch(() =>
			errorResponse(402, {
				error: 'Not enough credits',
				creditBalance: 5
			})
		)

		const client = new ScreenshotAPI({ apiKey: TEST_KEY })
		try {
			await client.screenshot({ url: 'https://example.com' })
			expect.unreachable('should have thrown')
		} catch (err) {
			expect(err).toBeInstanceOf(InsufficientCreditsError)
			expect((err as InsufficientCreditsError).status).toBe(402)
			expect((err as InsufficientCreditsError).balance).toBe(5)
			expect((err as InsufficientCreditsError).message).toBe(
				'Not enough credits'
			)
		}
	})

	test('handles 402 → defaults balance to 0 when not in body', async () => {
		mockFetch(() => errorResponse(402, { error: 'No credits' }))

		const client = new ScreenshotAPI({ apiKey: TEST_KEY })
		try {
			await client.screenshot({ url: 'https://example.com' })
			expect.unreachable('should have thrown')
		} catch (err) {
			expect((err as InsufficientCreditsError).balance).toBe(0)
		}
	})

	test('handles 403 → InvalidAPIKeyError', async () => {
		mockFetch(() => errorResponse(403, { error: 'API key is invalid' }))

		const client = new ScreenshotAPI({ apiKey: TEST_KEY })
		try {
			await client.screenshot({ url: 'https://example.com' })
			expect.unreachable('should have thrown')
		} catch (err) {
			expect(err).toBeInstanceOf(InvalidAPIKeyError)
			expect((err as InvalidAPIKeyError).status).toBe(403)
			expect((err as InvalidAPIKeyError).code).toBe('invalid_api_key')
		}
	})

	test('handles 500 → ScreenshotFailedError', async () => {
		mockFetch(() => errorResponse(500, { message: 'Render timed out' }))

		const client = new ScreenshotAPI({ apiKey: TEST_KEY })
		try {
			await client.screenshot({ url: 'https://example.com' })
			expect.unreachable('should have thrown')
		} catch (err) {
			expect(err).toBeInstanceOf(ScreenshotFailedError)
			expect((err as ScreenshotFailedError).status).toBe(500)
			expect((err as ScreenshotFailedError).message).toBe(
				'Render timed out'
			)
		}
	})

	test('handles 500 → defaults message to Screenshot failed', async () => {
		mockFetch(() => errorResponse(500, {}))

		const client = new ScreenshotAPI({ apiKey: TEST_KEY })
		try {
			await client.screenshot({ url: 'https://example.com' })
			expect.unreachable('should have thrown')
		} catch (err) {
			expect((err as ScreenshotFailedError).message).toBe(
				'Screenshot failed'
			)
		}
	})

	test('handles unknown error codes → ScreenshotAPIError', async () => {
		mockFetch(() => errorResponse(429, { error: 'Rate limited' }))

		const client = new ScreenshotAPI({ apiKey: TEST_KEY })
		try {
			await client.screenshot({ url: 'https://example.com' })
			expect.unreachable('should have thrown')
		} catch (err) {
			expect(err).toBeInstanceOf(ScreenshotAPIError)
			expect(err).not.toBeInstanceOf(AuthenticationError)
			expect((err as ScreenshotAPIError).status).toBe(429)
			expect((err as ScreenshotAPIError).code).toBe('unknown_error')
			expect((err as ScreenshotAPIError).message).toBe('Rate limited')
		}
	})

	test('handles non-JSON error response body', async () => {
		const response = new Response('Bad Gateway', {
			status: 502,
			statusText: 'Bad Gateway'
		})
		mockFetch(() => response)

		const client = new ScreenshotAPI({ apiKey: TEST_KEY })
		try {
			await client.screenshot({ url: 'https://example.com' })
			expect.unreachable('should have thrown')
		} catch (err) {
			expect(err).toBeInstanceOf(ScreenshotAPIError)
			expect((err as ScreenshotAPIError).status).toBe(502)
			expect((err as ScreenshotAPIError).code).toBe('unknown_error')
			expect((err as ScreenshotAPIError).message).toContain('502')
		}
	})

	test('wraps fetch failures in ScreenshotNetworkError', async () => {
		const cause = new TypeError('fetch failed')
		mockFetch(() => {
			throw cause
		})

		const client = new ScreenshotAPI({ apiKey: TEST_KEY })
		try {
			await client.screenshot({ url: 'https://example.com' })
			expect.unreachable('should have thrown')
		} catch (err) {
			expect(err).toBeInstanceOf(ScreenshotNetworkError)
			expect((err as ScreenshotNetworkError).status).toBe(0)
			expect((err as ScreenshotNetworkError).code).toBe('network_error')
			expect((err as ScreenshotNetworkError).cause).toBe(cause)
		}
	})

	test('uses error field then falls back to message field', async () => {
		mockFetch(() => errorResponse(400, { message: 'fallback msg' }))

		const client = new ScreenshotAPI({ apiKey: TEST_KEY })
		try {
			await client.screenshot({ url: 'https://example.com' })
			expect.unreachable('should have thrown')
		} catch (err) {
			expect((err as ScreenshotAPIError).message).toBe('fallback msg')
		}
	})

	// ─── Abort / timeout ─────────────────────────────────────────────

	test('respects timeout via AbortController', async () => {
		mockFetch((_url, init) => {
			const signal = init?.signal
			expect(signal).toBeDefined()
			expect(signal).toBeInstanceOf(AbortSignal)
			return successResponse()
		})

		const client = new ScreenshotAPI({
			apiKey: TEST_KEY,
			timeout: 5000
		})
		await client.screenshot({ url: 'https://example.com' })
		expect(globalThis.fetch).toHaveBeenCalledTimes(1)
	})

	test('wraps aborted timeout requests in ScreenshotTimeoutError', async () => {
		mockFetch((_url, init) => {
			return new Promise<Response>((_resolve, reject) => {
				const signal = init?.signal
				if (!(signal instanceof AbortSignal)) {
					reject(new Error('missing abort signal'))
					return
				}

				signal.addEventListener(
					'abort',
					() => reject(new DOMException('Aborted', 'AbortError')),
					{ once: true }
				)
			})
		})

		const client = new ScreenshotAPI({
			apiKey: TEST_KEY,
			timeout: 1
		})

		try {
			await client.screenshot({ url: 'https://example.com' })
			expect.unreachable('should have thrown')
		} catch (err) {
			expect(err).toBeInstanceOf(ScreenshotTimeoutError)
			expect((err as ScreenshotTimeoutError).timeoutMs).toBe(1)
			expect((err as ScreenshotTimeoutError).code).toBe('timeout_error')
		}
	})

	test('uses GET method', async () => {
		let capturedMethod = ''
		mockFetch((_url, init) => {
			capturedMethod = init?.method ?? ''
			return successResponse()
		})

		const client = new ScreenshotAPI({ apiKey: TEST_KEY })
		await client.screenshot({ url: 'https://example.com' })
		expect(capturedMethod).toBe('GET')
	})
})

// ─── save() ────────────────────────────────────────────────────────

describe('save()', () => {
	test('writes screenshot bytes and returns metadata', async () => {
		mockFetch(() =>
			successResponse({
				creditsRemaining: 321,
				screenshotId: 'ss_save',
				durationMs: 456
			})
		)

		const directory = await mkdtemp(join(tmpdir(), 'screenshotapi-'))
		const filePath = join(directory, 'capture.png')

		try {
			const client = new ScreenshotAPI({ apiKey: TEST_KEY })
			const metadata = await client.save({
				url: 'https://example.com',
				path: filePath
			})
			const file = await readFile(filePath)

			expect(file.byteLength).toBe(64)
			expect(metadata).toEqual({
				creditsRemaining: 321,
				screenshotId: 'ss_save',
				durationMs: 456
			})
		} finally {
			await rm(directory, { recursive: true, force: true })
		}
	})
})
