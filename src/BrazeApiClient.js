const { HttpClient } = require('@actions/http-client')

class BrazeApiClient {
	constructor(apiKey, restEndpoint) {
		this.httpClient = new HttpClient()
		this.brazeApiKey = apiKey
		this.brazeRestEndpoint = restEndpoint
		this.requestHeaders = {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${this.brazeApiKey}`
		}
	}

	async getContentBlocks(limit = 1000) {
		const contentBlocksResponse = await this.httpClient.get(
			`${this.brazeRestEndpoint}/content_blocks/list?limit=${limit}`,
			this.requestHeaders
		)

		const contentBlocksData = await contentBlocksResponse.readBody()
		const contentBlocksJson = JSON.parse(contentBlocksData)
		const contentBlockNames = contentBlocksJson.content_blocks.reduce(
			(acc, contentBlock) => {
				acc[contentBlock.name] = contentBlock.content_block_id
				return acc
			},
			{}
		)

		return contentBlockNames
	}

	async createContentBlock(contentBlockName, contentBlockContent) {
		const postData = JSON.stringify({
			name: contentBlockName,
			content: contentBlockContent
		})

		try {
			const apiResponse = await this.httpClient.post(
				`${this.brazeRestEndpoint}/content_blocks/create`,
				postData,
				this.requestHeaders
			)

			const json = await this.parseResponse(apiResponse)

			return json
		} catch (error) {
			throw new Error(
				`Failed to send data to API: ${error.message.statusCode}`
			)
		}
	}

	async updateContentBlock(contentBlockId, contentBlockContent) {
		const postData = JSON.stringify({
			content_block_id: contentBlockId,
			content: contentBlockContent
		})

		try {
			const apiResponse = await this.httpClient.post(
				`${this.brazeRestEndpoint}/content_blocks/update`,
				postData,
				this.requestHeaders
			)

			const json = await this.parseResponse(apiResponse)

			return json
		} catch (error) {
			throw new Error(
				`Failed to send data to API: ${error.message.statusCode}`
			)
		}
	}

	async parseResponse(apiResponse) {
		const apiResponseData = await apiResponse.readBody()
		const apiResponseJson = JSON.parse(apiResponseData)

		return apiResponseJson
	}
}

module.exports = BrazeApiClient
