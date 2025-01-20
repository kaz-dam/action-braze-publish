const core = require('@actions/core')
const github = require('@actions/github')
const BrazeApiClient = require('../src/BrazeApiClient')
const { run } = require('../src/main')

jest.mock('@actions/core')
jest.mock('@actions/github')
jest.mock('../src/brazeApi')

describe('run', () => {
	let getInputMock
	let getOctokitMock
	let getContentMock
	let compareCommitsMock

	beforeEach(() => {
		getInputMock = jest.spyOn(core, 'getInput')
		getOctokitMock = jest.spyOn(github, 'getOctokit')
		compareCommitsMock = jest.fn()
		getContentMock = jest.fn()
		github.context = {
			repo: {
				owner: 'owner',
				repo: 'repo'
			},
			payload: {
				before: 'sha456'
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
					compareCommits: compareCommitsMock,
					getContent: getContentMock
				}
			}
		})

		BrazeApiClient.mockImplementation(() => {
			return {
				getContentBlocks: jest
					.fn()
					.mockReturnValue({ 'existing-block': 'block_id_1' }),
				updateContentBlock: jest
					.fn()
					.mockResolvedValue({ liquid_tag: 'updated-tag' }),
				createContentBlock: jest.fn().mockResolvedValue({
					liquid_tag: 'created-tag',
					message: 'success'
				})
			}
		})
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	it('should process modified files and update content blocks', async () => {
		compareCommitsMock.mockResolvedValue({
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
		compareCommitsMock.mockResolvedValue({
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

	it('should create new content blocks successfully', async () => {
		BrazeApiClient.mockImplementation(() => {
			return {
				getContentBlocks: jest
					.fn()
					.mockReturnValue({ 'existing-block': 'block_id_1' }),
				updateContentBlock: jest.fn(),
				createContentBlock: jest.fn().mockResolvedValue({
					message: 'success',
					liquid_tag: 'created-tag'
				})
			}
		})

		compareCommitsMock.mockResolvedValue({
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

	it('should handle content block creation failure', async () => {
		BrazeApiClient.mockImplementation(() => {
			return {
				getContentBlocks: jest
					.fn()
					.mockReturnValue({ 'existing-block': 'block_id_1' }),
				updateContentBlock: jest.fn(),
				createContentBlock: jest.fn().mockResolvedValue({
					message: 'error',
					liquid_tag: 'created-tag'
				})
			}
		})

		compareCommitsMock.mockResolvedValue({
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
			'Content block content: new content...'
		)
		expect(core.debug).toHaveBeenCalledWith(
			'Failed to create content block: error'
		)
	})

	it('should ignore non-content block files', async () => {
		compareCommitsMock.mockResolvedValue({
			data: {
				files: [
					{
						filename: 'some-other-file.txt',
						status: 'added'
					}
				]
			}
		})

		await run()

		expect(core.debug).toHaveBeenCalledWith('File: some-other-file.txt')
		expect(core.debug).toHaveBeenCalledWith(
			'Skipping file: some-other-file.txt'
		)
	})

	it('should process files in content_blocks directory', async () => {
		compareCommitsMock.mockResolvedValue({
			data: {
				files: [
					{
						filename: 'content_blocks/some-block.liquid',
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

		expect(core.debug).toHaveBeenCalledWith(
			'File: content_blocks/some-block.liquid'
		)
		expect(core.debug).toHaveBeenCalledWith(
			'Creating content block: some-block'
		)
		expect(core.debug).toHaveBeenCalledWith(
			'Content block created: created-tag'
		)
	})

	it('should ignore unmodified files', async () => {
		compareCommitsMock.mockResolvedValue({
			data: {
				files: [
					{
						filename: 'existing-block.liquid',
						status: 'removed'
					}
				]
			}
		})

		await run()

		expect(core.debug).toHaveBeenCalledWith(
			'Content blocks: existing-block'
		)
	})

	it('should handle errors gracefully', async () => {
		const errorMessage = 'Something went wrong'
		compareCommitsMock.mockRejectedValue(new Error(errorMessage))

		await run()

		expect(core.setFailed).toHaveBeenCalledWith(errorMessage)
	})
})
