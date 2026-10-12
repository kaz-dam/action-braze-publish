const core = require('@actions/core')
const github = require('@actions/github')
const BrazeApiClient = require('../src/BrazeApiClient')
const InitDeployer = require('../src/InitDeployer')
const UpdateDeployer = require('../src/UpdateDeployer')
const { run } = require('../src/main')

jest.mock('@actions/core')
jest.mock('@actions/github')
jest.mock('../src/BrazeApiClient')
jest.mock('../src/InitDeployer')
jest.mock('../src/UpdateDeployer')

describe('main.js', () => {
	let mockGetInput
	let mockGetOctokit
	let mockContext
	let mockBrazeClient
	let mockInitDeployer
	let mockUpdateDeployer

	const originalBaseRef = process.env.GITHUB_BASE_REF

	beforeEach(() => {
		delete process.env.GITHUB_BASE_REF
		jest.spyOn(core, 'setFailed')
		mockGetInput = jest.spyOn(core, 'getInput')
		mockGetInput.mockImplementation(inputName => {
			const inputs = {
				GITHUB_TOKEN: 'test-token',
				BRAZE_REST_ENDPOINT: 'https://test.braze.endpoint',
				BRAZE_API_KEY: 'test-api-key',
				DEPLOYMENT_MODE: 'init',
				BRAZE_CONTENT_BLOCK_PREFIX: ''
			}
			return inputs[inputName]
		})

		mockContext = {
			repo: {
				owner: 'test-owner',
				repo: 'test-repo'
			},
			payload: {
				before: 'base-sha'
			},
			sha: 'head-sha'
		}
		github.context = mockContext

		mockGetOctokit = {
			rest: {
				repos: {
					compareCommits: jest.fn(),
					getContent: jest.fn()
				}
			}
		}
		mockGetOctokit = jest
			.spyOn(github, 'getOctokit')
			.mockReturnValue(mockGetOctokit)

		mockBrazeClient = {
			getContentBlocks: jest.fn().mockResolvedValue({
				block1: 'block_id_1',
				block2: 'block_id_2'
			})
		}
		BrazeApiClient.mockImplementation(() => mockBrazeClient)

		mockInitDeployer = jest.spyOn(InitDeployer.prototype, 'deploy')
		mockInitDeployer.mockImplementation(() => {
			return {
				deploy: jest.fn().mockResolvedValue()
			}
		})

		mockUpdateDeployer = jest.spyOn(UpdateDeployer.prototype, 'deploy')
		mockUpdateDeployer.mockImplementation(() => {
			return {
				deploy: jest.fn().mockResolvedValue()
			}
		})
	})

	afterEach(() => {
		if (originalBaseRef === undefined) {
			delete process.env.GITHUB_BASE_REF
		} else {
			process.env.GITHUB_BASE_REF = originalBaseRef
		}
		jest.resetAllMocks()
	})

	it('should instantiate BrazeApiClient with the correct arguments', async () => {
		await run()

		expect(BrazeApiClient).toHaveBeenCalledWith(
			'test-api-key',
			'https://test.braze.endpoint'
		)
		expect(mockBrazeClient.getContentBlocks).toHaveBeenCalled()
	})

	it('should call InitDeployer for "init" deployment mode', async () => {
		await run()

		expect(InitDeployer).toHaveBeenCalledWith(mockBrazeClient)
		expect(UpdateDeployer).not.toHaveBeenCalled()

		const initDeployerInstance = InitDeployer.mock.instances[0]
		expect(initDeployerInstance.deploy).toHaveBeenCalled()
	})

	it('should call UpdateDeployer for "update" deployment mode', async () => {
		mockGetInput.mockImplementation(inputName => {
			const inputs = {
				GITHUB_TOKEN: 'test-token',
				BRAZE_REST_ENDPOINT: 'https://api.braze.com',
				BRAZE_API_KEY: 'test-api-key',
				DEPLOYMENT_MODE: 'update',
				BRAZE_CONTENT_BLOCK_PREFIX: ''
			}
			return inputs[inputName]
		})

		await run()

		expect(UpdateDeployer).toHaveBeenCalledWith(
			github.getOctokit('test-token'),
			mockBrazeClient,
			'test-owner',
			'test-repo',
			'base-sha',
			'head-sha'
		)
		expect(InitDeployer).not.toHaveBeenCalled()

		const updateDeployerInstance = UpdateDeployer.mock.instances[0]
		expect(updateDeployerInstance.deploy).toHaveBeenCalled()
	})

	it('should create prod content blocks when the push branch is stage', async () => {
		mockContext.ref = 'refs/heads/stage'
		mockGetInput.mockImplementation(inputName => {
			const inputs = {
				GITHUB_TOKEN: 'test-token',
				BRAZE_REST_ENDPOINT: 'https://api.braze.com',
				BRAZE_API_KEY: 'test-api-key',
				DEPLOYMENT_MODE: 'update',
				BRAZE_CONTENT_BLOCK_PREFIX: 'STAGE_'
			}
			return inputs[inputName]
		})

		await run()

		const updateDeployerInstance = UpdateDeployer.mock.instances[0]
		expect(
			updateDeployerInstance.setContentBlockProperties
		).toHaveBeenCalledWith(
			['block1', 'block2'],
			{ block1: 'block_id_1', block2: 'block_id_2' },
			'STAGE_',
			true
		)
	})

	it('should create prod content blocks when the pull request base branch is stage', async () => {
		mockContext.ref = 'refs/pull/12/merge'
		mockContext.payload.pull_request = { base: { ref: 'stage' } }
		mockGetInput.mockImplementation(inputName => {
			const inputs = {
				GITHUB_TOKEN: 'test-token',
				BRAZE_REST_ENDPOINT: 'https://api.braze.com',
				BRAZE_API_KEY: 'test-api-key',
				DEPLOYMENT_MODE: 'update',
				BRAZE_CONTENT_BLOCK_PREFIX: 'STAGE_'
			}
			return inputs[inputName]
		})

		await run()

		const updateDeployerInstance = UpdateDeployer.mock.instances[0]
		expect(
			updateDeployerInstance.setContentBlockProperties
		).toHaveBeenCalledWith(
			['block1', 'block2'],
			{ block1: 'block_id_1', block2: 'block_id_2' },
			'STAGE_',
			true
		)
	})

	it('should not create prod content blocks when the base branch is not stage', async () => {
		mockContext.ref = 'refs/heads/main'
		mockGetInput.mockImplementation(inputName => {
			const inputs = {
				GITHUB_TOKEN: 'test-token',
				BRAZE_REST_ENDPOINT: 'https://api.braze.com',
				BRAZE_API_KEY: 'test-api-key',
				DEPLOYMENT_MODE: 'update',
				BRAZE_CONTENT_BLOCK_PREFIX: ''
			}
			return inputs[inputName]
		})

		await run()

		const updateDeployerInstance = UpdateDeployer.mock.instances[0]
		expect(
			updateDeployerInstance.setContentBlockProperties
		).toHaveBeenCalledWith(
			['block1', 'block2'],
			{ block1: 'block_id_1', block2: 'block_id_2' },
			'',
			false
		)
	})

	it('should handle errors gracefully', async () => {
		const errorMessage = 'Something went wrong'
		InitDeployer.mockImplementation(() => ({
			deploy: jest.fn().mockRejectedValue(new Error(errorMessage)),
			setContentBlockProperties: jest.fn()
		}))

		await run()

		expect(core.setFailed).toHaveBeenCalledWith(errorMessage)
	})
})
