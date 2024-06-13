const core = require('@actions/core')
const github = require('@actions/github')
const BrazeApiClient = require('../src/brazeApi')
const { run } = require('../src/main')

jest.mock('@actions/core')
jest.mock('@actions/github')
jest.mock('../src/brazeApi')

describe('run', () => {
	let getInputMock, getOctokitMock, getContentMock, getCommitMock

	beforeEach(() => {
		getInputMock = jest.spyOn(core, 'getInput')
		getOctokitMock = jest.spyOn(github, 'getOctokit')
		getCommitMock = jest.fn()
		getContentMock = jest.fn()
		github.context = {
			repo: {
				owner: 'owner',
				repo: 'repo'
			},
			sha: 'sha123'
		}

		getInputMock.mockImplementation(name => {
			switch (name) {
				case 'GITHUB_TOKEN':
					return 'mock-github-token'
				case 'BRAZE_REST_ENDPOINT':
					return 'mock-braze-rest-endpoint'
				case 'BRAZE_API_KEY':
					return 'mock-braze-api-key'
			}
		})

		getOctokitMock.mockReturnValue({
			rest: {
				repos: {
					getCommit: getCommitMock,
					getContent: getContentMock
				}
			}
		})

		BrazeApiClient.mockImplementation(() => {
			return {
				getContentBlocks: jest.fn().mockReturnValue(['existing-block']),
				updateContentBlock: jest
					.fn()
					.mockResolvedValue({ liquid_tag: 'updated-tag' }),
				createContentBlock: jest
					.fn()
					.mockResolvedValue({ liquid_tag: 'created-tag' })
			}
		})
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	it('should process modified files and update content blocks', async () => {
		getCommitMock.mockResolvedValue({
			data: {
				files: [
					{
						filename: 'existing-block.liquid',
						status: 'modified'
					}
				]
			}
		})

		getContentMock.mockResolvedValue({
			data: {
				content: Buffer.from('new content').toString('base64')
			}
		})

		await run()

		expect(core.debug).toHaveBeenCalledWith('File: existing-block.liquid')
		expect(core.debug).toHaveBeenCalledWith(
			'Content block exists: existing-block'
		)
		expect(core.debug).toHaveBeenCalledWith(
			'Content block updated: updated-tag'
		)
	})

	it('should process added files and create new content blocks', async () => {
		getCommitMock.mockResolvedValue({
			data: {
				files: [
					{
						filename: 'new-block.liquid',
						status: 'added'
					}
				]
			}
		})

		getContentMock.mockResolvedValue({
			data: {
				content: Buffer.from('new content').toString('base64')
			}
		})

		await run()

		expect(core.debug).toHaveBeenCalledWith('File: new-block.liquid')
		expect(core.debug).toHaveBeenCalledWith(
			'Content block does not exist: new-block'
		)
		expect(core.debug).toHaveBeenCalledWith(
			'Creating content block: new-block'
		)
		expect(core.debug).toHaveBeenCalledWith(
			'Content block created: created-tag'
		)
	})

	it('should handle errors gracefully', async () => {
		const errorMessage = 'Something went wrong'
		getCommitMock.mockRejectedValue(new Error(errorMessage))

		await run()

		expect(core.setFailed).toHaveBeenCalledWith(errorMessage)
	})
})
