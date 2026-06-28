import { ScreenshotAPI, ScreenshotAPIError } from 'screenshotapi-to'

export interface Env {
	SCREENSHOTAPI_KEY: string
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const { searchParams } = new URL(request.url)
		const url = searchParams.get('url')

		if (!url) {
			return Response.json({ error: 'url is required' }, { status: 400 })
		}

		const client = new ScreenshotAPI({
			apiKey: env.SCREENSHOTAPI_KEY,
			timeout: 30_000
		})

		try {
			const screenshot = await client.screenshot({
				url,
				type: 'webp',
				quality: 85,
				waitUntil: 'networkidle0'
			})

			return new Response(screenshot.image, {
				headers: {
					'content-type': screenshot.contentType,
					'cache-control': 'public, max-age=3600'
				}
			})
		} catch (error) {
			if (error instanceof ScreenshotAPIError) {
				return Response.json(
					{ error: error.message, code: error.code },
					{ status: error.status || 502 }
				)
			}

			throw error
		}
	}
}
