import { writeFile } from 'node:fs/promises'
import { ScreenshotAPI } from '@screenshotapi/sdk'

const apiKey = process.env.SCREENSHOTAPI_KEY

if (!apiKey) {
	throw new Error('Set SCREENSHOTAPI_KEY before running this example.')
}

const client = new ScreenshotAPI({ apiKey })

const result = await client.screenshot({
	url: 'https://example.com',
	fullPage: true,
	type: 'png'
})

await writeFile('example.png', new Uint8Array(result.image))

console.log(`Saved example.png (${result.contentType})`)
console.log(`Credits remaining: ${result.metadata.creditsRemaining}`)
