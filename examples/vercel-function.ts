import { ScreenshotAPI, ScreenshotAPIError } from '@screenshotapi/sdk'

export const config = {
	runtime: 'edge'
}

export default async function handler(request: Request) {
	const apiKey = process.env.SCREENSHOTAPI_KEY

	if (!apiKey) {
		return Response.json(
			{ error: 'SCREENSHOTAPI_KEY is not configured' },
			{ status: 500 }
		)
	}

	const { searchParams } = new URL(request.url)
	const url = searchParams.get('url')

	if (!url) {
		return Response.json({ error: 'url is required' }, { status: 400 })
	}

	const client = new ScreenshotAPI({ apiKey })

	try {
		const screenshot = await client.screenshot({
			url,
			width: 1280,
			height: 720,
			type: 'png'
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
