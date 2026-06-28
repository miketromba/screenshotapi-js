import {
	AuthenticationError,
	InsufficientCreditsError,
	InvalidAPIKeyError,
	ScreenshotAPIError,
	ScreenshotFailedError,
	ScreenshotNetworkError,
	ScreenshotTimeoutError
} from './errors'
import type {
	GeoLocationOptions,
	ScreenshotAPIConfig,
	ScreenshotMetadata,
	ScreenshotOptions,
	ScreenshotResult
} from './types'

const DEFAULT_BASE_URL = 'https://screenshotapi.to'
const DEFAULT_TIMEOUT = 60_000

function isAbortError(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'name' in error &&
		error.name === 'AbortError'
	)
}

function setSearchParam(params: URLSearchParams, key: string, value: unknown) {
	if (value === undefined || value === null) return
	if (Array.isArray(value)) {
		params.set(key, value.join(','))
		return
	}
	params.set(key, String(value))
}

function setBodyValue(
	body: Record<string, unknown>,
	key: string,
	value: unknown
) {
	if (value !== undefined && value !== null) {
		body[key] = value
	}
}

export class ScreenshotAPI {
	private readonly apiKey: string
	private readonly baseUrl: string
	private readonly timeout: number

	constructor(config: ScreenshotAPIConfig) {
		if (!config.apiKey) {
			throw new Error('API key is required')
		}
		this.apiKey = config.apiKey
		this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '')
		this.timeout = config.timeout ?? DEFAULT_TIMEOUT
	}

	async screenshot(options: ScreenshotOptions): Promise<ScreenshotResult> {
		if (!options.url && !options.html) {
			throw new Error('URL or HTML is required')
		}

		const controller = new AbortController()
		const timer = setTimeout(() => controller.abort(), this.timeout)

		try {
			const response = await this.fetchScreenshot(options, controller)

			if (!response.ok) {
				await this.handleError(response)
			}

			const image = await response.arrayBuffer()
			const metadata: ScreenshotMetadata = {
				creditsRemaining: Number(
					response.headers.get('x-credits-remaining') ?? 0
				),
				screenshotId: response.headers.get('x-screenshot-id') ?? '',
				durationMs: Number(response.headers.get('x-duration-ms') ?? 0)
			}

			return {
				image,
				metadata,
				contentType: response.headers.get('content-type') ?? 'image/png'
			}
		} catch (error) {
			if (error instanceof ScreenshotAPIError) {
				throw error
			}

			if (isAbortError(error)) {
				throw new ScreenshotTimeoutError(this.timeout)
			}

			throw new ScreenshotNetworkError('Screenshot request failed', error)
		} finally {
			clearTimeout(timer)
		}
	}

	async save(
		options: ScreenshotOptions & { path: string }
	): Promise<ScreenshotMetadata> {
		const { path, ...screenshotOptions } = options
		const result = await this.screenshot(screenshotOptions)

		if (typeof globalThis.process !== 'undefined') {
			const { writeFile } = await import('node:fs/promises')
			await writeFile(path, Buffer.from(result.image))
		} else {
			throw new Error('save() is only available in Node.js environments')
		}

		return result.metadata
	}

	private async fetchScreenshot(
		options: ScreenshotOptions,
		controller: AbortController
	): Promise<Response> {
		const endpoint = `${this.baseUrl}/api/v1/screenshot`
		const headers = { 'x-api-key': this.apiKey }

		if (options.html !== undefined) {
			return fetch(endpoint, {
				method: 'POST',
				headers: {
					...headers,
					'content-type': 'application/json'
				},
				body: JSON.stringify(this.buildBody(options)),
				signal: controller.signal
			})
		}

		const params = this.buildParams(options)
		return fetch(`${endpoint}?${params.toString()}`, {
			method: 'GET',
			headers,
			signal: controller.signal
		})
	}

	private buildParams(options: ScreenshotOptions): URLSearchParams {
		const params = new URLSearchParams()
		setSearchParam(params, 'url', options.url)
		setSearchParam(params, 'width', options.width)
		setSearchParam(params, 'height', options.height)
		setSearchParam(params, 'fullPage', options.fullPage)
		setSearchParam(params, 'type', options.type)
		setSearchParam(params, 'quality', options.quality)
		setSearchParam(params, 'colorScheme', options.colorScheme)
		setSearchParam(params, 'waitUntil', options.waitUntil)
		setSearchParam(params, 'waitForSelector', options.waitForSelector)
		setSearchParam(params, 'delay', options.delay)
		setSearchParam(params, 'blockAds', options.blockAds)
		setSearchParam(
			params,
			'removeCookieBanners',
			options.removeCookieBanners
		)
		setSearchParam(params, 'cssInject', options.cssInject)
		setSearchParam(params, 'jsInject', options.jsInject)
		setSearchParam(params, 'stealthMode', options.stealthMode)
		setSearchParam(params, 'devicePixelRatio', options.devicePixelRatio)
		setSearchParam(params, 'timezone', options.timezone)
		setSearchParam(params, 'locale', options.locale)
		setSearchParam(params, 'cacheTtl', options.cacheTtl)
		setSearchParam(params, 'preloadFonts', options.preloadFonts)
		setSearchParam(params, 'removeElements', options.removeElements)
		setSearchParam(params, 'removePopups', options.removePopups)
		setSearchParam(params, 'mockupDevice', options.mockupDevice)
		this.setGeoQueryParams(params, options.geoLocation)
		return params
	}

	private buildBody(options: ScreenshotOptions): Record<string, unknown> {
		const body: Record<string, unknown> = {}
		setBodyValue(body, 'url', options.url)
		setBodyValue(body, 'html', options.html)
		setBodyValue(body, 'width', options.width)
		setBodyValue(body, 'height', options.height)
		setBodyValue(body, 'fullPage', options.fullPage)
		setBodyValue(body, 'type', options.type)
		setBodyValue(body, 'quality', options.quality)
		setBodyValue(body, 'colorScheme', options.colorScheme)
		setBodyValue(body, 'waitUntil', options.waitUntil)
		setBodyValue(body, 'waitForSelector', options.waitForSelector)
		setBodyValue(body, 'delay', options.delay)
		setBodyValue(body, 'blockAds', options.blockAds)
		setBodyValue(body, 'removeCookieBanners', options.removeCookieBanners)
		setBodyValue(body, 'cssInject', options.cssInject)
		setBodyValue(body, 'jsInject', options.jsInject)
		setBodyValue(body, 'stealthMode', options.stealthMode)
		setBodyValue(body, 'devicePixelRatio', options.devicePixelRatio)
		setBodyValue(body, 'timezone', options.timezone)
		setBodyValue(body, 'locale', options.locale)
		setBodyValue(body, 'cacheTtl', options.cacheTtl)
		setBodyValue(body, 'preloadFonts', options.preloadFonts)
		setBodyValue(body, 'removeElements', options.removeElements)
		setBodyValue(body, 'removePopups', options.removePopups)
		setBodyValue(body, 'mockupDevice', options.mockupDevice)
		setBodyValue(body, 'geoLocation', options.geoLocation)
		return body
	}

	private setGeoQueryParams(
		params: URLSearchParams,
		geoLocation: GeoLocationOptions | undefined
	) {
		if (!geoLocation) return
		setSearchParam(params, 'geoLatitude', geoLocation.latitude)
		setSearchParam(params, 'geoLongitude', geoLocation.longitude)
		setSearchParam(params, 'geoAccuracy', geoLocation.accuracy)
	}

	private async handleError(response: Response): Promise<never> {
		let body: Record<string, unknown>
		try {
			body = (await response.json()) as Record<string, unknown>
		} catch {
			throw new ScreenshotAPIError(
				`HTTP ${response.status}: ${response.statusText}`,
				response.status,
				'unknown_error'
			)
		}

		const message = String(body.error ?? body.message ?? 'Unknown error')

		switch (response.status) {
			case 401:
				throw new AuthenticationError(message)
			case 402:
				throw new InsufficientCreditsError(
					message,
					Number(body.balance ?? 0)
				)
			case 403:
				throw new InvalidAPIKeyError(message)
			case 500:
				throw new ScreenshotFailedError(
					String(body.message ?? body.error ?? 'Screenshot failed')
				)
			default:
				throw new ScreenshotAPIError(
					message,
					response.status,
					'unknown_error'
				)
		}
	}
}
