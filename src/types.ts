export interface ScreenshotAPIConfig {
	apiKey: string
	baseUrl?: string
	timeout?: number
}

export interface GeoLocationOptions {
	latitude: number
	longitude: number
	accuracy?: number
}

export interface ScreenshotOptions {
	url?: string
	html?: string
	width?: number
	height?: number
	fullPage?: boolean
	type?: 'png' | 'jpeg' | 'webp' | 'pdf'
	quality?: number
	colorScheme?: 'light' | 'dark'
	waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2'
	waitForSelector?: string
	delay?: number
	blockAds?: boolean
	removeCookieBanners?: boolean
	cssInject?: string
	jsInject?: string
	stealthMode?: boolean
	devicePixelRatio?: 1 | 2 | 3
	timezone?: string
	locale?: string
	cacheTtl?: number
	preloadFonts?: boolean
	removeElements?: string[]
	removePopups?: boolean
	mockupDevice?: 'browser' | 'iphone' | 'macbook'
	geoLocation?: GeoLocationOptions
}

export interface ScreenshotMetadata {
	creditsRemaining: number
	screenshotId: string
	durationMs: number
}

export interface ScreenshotResult {
	image: ArrayBuffer
	metadata: ScreenshotMetadata
	contentType: string
}
