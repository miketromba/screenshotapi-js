export class ScreenshotAPIError extends Error {
	readonly status: number
	readonly code: string

	constructor(message: string, status: number, code: string) {
		super(message)
		this.name = 'ScreenshotAPIError'
		this.status = status
		this.code = code
	}
}

export class ScreenshotNetworkError extends ScreenshotAPIError {
	readonly cause: unknown

	constructor(message: string, cause?: unknown) {
		super(message, 0, 'network_error')
		this.name = 'ScreenshotNetworkError'
		this.cause = cause
	}
}

export class ScreenshotTimeoutError extends ScreenshotAPIError {
	readonly timeoutMs: number

	constructor(timeoutMs: number) {
		super(
			`Screenshot request timed out after ${timeoutMs}ms`,
			0,
			'timeout_error'
		)
		this.name = 'ScreenshotTimeoutError'
		this.timeoutMs = timeoutMs
	}
}

export class AuthenticationError extends ScreenshotAPIError {
	constructor(message: string) {
		super(message, 401, 'authentication_error')
		this.name = 'AuthenticationError'
	}
}

export class InsufficientCreditsError extends ScreenshotAPIError {
	readonly balance: number

	constructor(message: string, balance: number) {
		super(message, 402, 'insufficient_credits')
		this.name = 'InsufficientCreditsError'
		this.balance = balance
	}
}

export class InvalidAPIKeyError extends ScreenshotAPIError {
	constructor(message: string) {
		super(message, 403, 'invalid_api_key')
		this.name = 'InvalidAPIKeyError'
	}
}

export class ScreenshotFailedError extends ScreenshotAPIError {
	constructor(message: string) {
		super(message, 500, 'screenshot_failed')
		this.name = 'ScreenshotFailedError'
	}
}
