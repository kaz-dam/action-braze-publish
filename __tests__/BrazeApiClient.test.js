const BrazeApiClient = require('../src/BrazeApiClient')
const { HttpClient } = require('@actions/http-client')
jest.mock('@actions/http-client')

describe('BrazeApiClient', () => {
	let httpClientMock
	let brazeApiClient
	// codeql [js/hardcoded-credentials]: this is a mock API key used for testing purposes
	const apiKey = 'mock-api-key'
	const apiUrl = 'https://mock-braze-rest-endpoint'

	beforeEach(() => {
		httpClientMock = {
			get: jest.fn(),
			post: jest.fn()
		}

		HttpClient.mockImplementation(() => httpClientMock)
		brazeApiClient = new BrazeApiClient(apiKey, apiUrl)
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	it('should get content blocks', async () => {
		const mockResponse = {
			readBody: jest.fn().mockResolvedValue(
				JSON.stringify({
					content_blocks: [
						{ name: 'block1', content_block_id: 'block_id_1' },
						{ name: 'block2', content_block_id: 'block_id_1' }
					]
				})
			)
		}
		httpClientMock.get.mockResolvedValue(mockResponse)

		const result = await brazeApiClient.getContentBlocks()

		expect(httpClientMock.get).toHaveBeenCalledWith(
			`${apiUrl}/content_blocks/list`,
			{
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			}
		)
		expect(result).toEqual({ block1: 'block_id_1', block2: 'block_id_1' })
	})

	it('should update a content block', async () => {
		const mockResponse = {
			readBody: jest
				.fn()
				.mockResolvedValue(
					JSON.stringify({ liquid_tag: 'updated-tag' })
				)
		}
		httpClientMock.post.mockResolvedValue(mockResponse)

		const result = await brazeApiClient.updateContentBlock(
			'block_id_1',
			'new content'
		)

		expect(httpClientMock.post).toHaveBeenCalledWith(
			`${apiUrl}/content_blocks/update`,
			JSON.stringify({
				content_block_id: 'block_id_1',
				content: 'new content'
			}),
			{
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			}
		)
		expect(result).toEqual({ liquid_tag: 'updated-tag' })
	})

	it('should create a content block', async () => {
		const mockResponse = {
			readBody: jest
				.fn()
				.mockResolvedValue(
					JSON.stringify({ liquid_tag: 'created-tag' })
				)
		}
		httpClientMock.post.mockResolvedValue(mockResponse)

		const result = await brazeApiClient.createContentBlock(
			'block1',
			'new content'
		)

		expect(httpClientMock.post).toHaveBeenCalledWith(
			`${apiUrl}/content_blocks/create`,
			JSON.stringify({
				name: 'block1',
				content: 'new content'
			}),
			{
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			}
		)
		expect(result).toEqual({ liquid_tag: 'created-tag' })
	})

	it('should throw an error when the API call fails', async () => {
		const mockError = new Error('mock error')
		httpClientMock.post.mockRejectedValue(mockError)

		await expect(
			brazeApiClient.createContentBlock('block1', 'new content')
		).rejects.toThrow(
			`Failed to send data to API: ${mockError.message.statusCode}`
		)

		await expect(
			brazeApiClient.updateContentBlock('block1', 'new content')
		).rejects.toThrow(
			`Failed to send data to API: ${mockError.message.statusCode}`
		)
	})
})
