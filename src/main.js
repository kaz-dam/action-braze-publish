const core = require('@actions/core')
const github = require('@actions/github')
const BrazeApiClient = require('./BrazeApiClient')
const InitDeployer = require('./InitDeployer')
const UpdateDeployer = require('./UpdateDeployer')
const Logger = require('./Logger')
const Constants = require('./Constants')

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
	try {
		Logger.info('Starting the action')

		const token = core.getInput('GITHUB_TOKEN')
		const brazeRestEndpoint = core.getInput('BRAZE_REST_ENDPOINT')
		const brazeApiKey = core.getInput('BRAZE_API_KEY')
		const deploymentMode = core.getInput('DEPLOYMENT_MODE')
		const brazeContentBlockPrefix = core.getInput(
			'BRAZE_CONTENT_BLOCK_PREFIX'
		)

		const octokit = github.getOctokit(token)
		const context = github.context
		const brazeClient = new BrazeApiClient(brazeApiKey, brazeRestEndpoint)

		const owner = context.repo.owner
		const repo = context.repo.repo
		const baseSha = context.payload.before
		const headSha = context.sha
		const baseBranch = getBaseBranch(context)
		const createProdContentBlockForNewFiles =
			baseBranch === Constants.STAGE_BRANCH

		const contentBlocks = await brazeClient.getContentBlocks()
		const contentBlockNames = Object.keys(contentBlocks)

		Logger.info(`Base branch: ${baseBranch || 'unknown'}`)
		Logger.info(
			`Existing content blocks on the instance: ${contentBlockNames.join(', ')}`
		)

		let deployer

		if (deploymentMode === 'init') {
			Logger.debug('Using the init deployer')

			deployer = new InitDeployer(brazeClient)
		} else {
			Logger.debug('Using the update deployer')

			deployer = new UpdateDeployer(
				octokit,
				brazeClient,
				owner,
				repo,
				baseSha,
				headSha
			)
		}

		deployer.setContentBlockProperties(
			contentBlockNames,
			contentBlocks,
			brazeContentBlockPrefix,
			createProdContentBlockForNewFiles
		)

		await deployer.deploy()
	} catch (error) {
		core.setFailed(error.message)
	}
}

function getBaseBranch(context) {
	const pullRequest = context.payload && context.payload.pull_request
	const pullRequestBase =
		(pullRequest && pullRequest.base && pullRequest.base.ref) ||
		process.env.GITHUB_BASE_REF

	if (pullRequestBase) {
		return pullRequestBase
	}

	const payloadRef = context.payload && context.payload.ref
	const ref = context.ref || payloadRef || ''
	const headsPrefix = 'refs/heads/'

	if (ref.startsWith(headsPrefix)) {
		return ref.slice(headsPrefix.length)
	}

	return ''
}

module.exports = {
	run
}
