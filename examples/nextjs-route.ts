import { ScreenshotAPI, ScreenshotAPIError } from '@screenshotapi/sdk'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: Request) {
	const apiKey = process.env.SCREENSHOTAPI_KEY

	if (!apiKey) {
		return NextResponse.json(
			{ error: 'SCREENSHOTAPI_KEY is not configured' },
			{ status: 500 }
		)
	}

	const { searchParams } = new URL(request.url)
	const url = searchParams.get('url')

	if (!url) {
		return NextResponse.json({ error: 'url is required' }, { status: 400 })
	}

	const client = new ScreenshotAPI({ apiKey })

	try {
		const screenshot = await client.screenshot({
			url,
			type: 'webp',
			quality: 85,
			fullPage: searchParams.get('fullPage') === 'true'
		})

		return new NextResponse(screenshot.image, {
			headers: {
				'content-type': screenshot.contentType,
				'cache-control': 'public, max-age=3600'
			}
		})
	} catch (error) {
		if (error instanceof ScreenshotAPIError) {
			return NextResponse.json(
				{ error: error.message, code: error.code },
				{ status: error.status || 502 }
			)
		}

		throw error
	}
}
