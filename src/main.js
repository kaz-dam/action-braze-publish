const core = require('@actions/core')
const github = require('@actions/github')
const BrazeApiClient = require('./brazeApi')

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
	try {
		const token = core.getInput('GITHUB_TOKEN')
		const brazeRestEndpoint = core.getInput('BRAZE_REST_ENDPOINT')
		const brazeApiKey = core.getInput('BRAZE_API_KEY')
		const octokit = github.getOctokit(token)
		const context = github.context
		const brazeClient = new BrazeApiClient(brazeApiKey, brazeRestEndpoint)

		const owner = context.repo.owner
		const repo = context.repo.repo
		const sha = context.sha

		// get list of existing content blocks from Braze
		const contentBlockNames = await brazeClient.getContentBlocks()
		core.debug(`Content blocks: ${contentBlockNames.join(', ')}`)

		// get the changed files from the commit
		const response = await octokit.rest.repos.getCommit({
			owner,
			repo,
			ref: sha
		})

		const files = response.data.files

		// loop through the files and update the content blocks
		for (const file of files) {
			// only process added or modified files
			if (file.status === 'added' || file.status === 'modified') {
				const filePath = file.filename
				const fileName = filePath.split('/').pop()
				const fileExtension = filePath.split('.').pop()
				const isContentBlock =
					filePath
						.split('/')
						.slice(0, -1)
						.filter(part => part === 'content_blocks').length > 0 ||
					fileExtension === 'liquid'

				core.debug(`File: ${filePath}`)

				if (!isContentBlock) {
					core.debug(`Skipping file: ${filePath}`)
					continue
				}

				const contentResponse = await octokit.rest.repos.getContent({
					owner,
					repo,
					path: filePath,
					ref: sha
				})

				const content = Buffer.from(
					contentResponse.data.content,
					'base64'
				).toString('utf8')

				const contentBlockName = fileName
					.split('.')
					.slice(0, -1)
					.join('.')

				// check if the content block exists and update or create it
				if (contentBlockNames.includes(contentBlockName)) {
					core.debug(`Content block exists: ${contentBlockName}`)

					const apiResponseJson =
						await brazeClient.updateContentBlock(
							contentBlockName,
							content
						)

					core.debug(
						`Content block updated: ${apiResponseJson.liquid_tag}`
					)
				} else {
					core.debug(
						`Content block does not exist: ${contentBlockName}`
					)
					core.debug(`Creating content block: ${contentBlockName}`)

					const apiResponseJson =
						await brazeClient.createContentBlock(
							contentBlockName,
							content
						)

					core.debug(
						`Content block created: ${apiResponseJson.liquid_tag}`
					)
				}
			}
		}
	} catch (error) {
		core.setFailed(error.message)
	}
}

module.exports = {
	run
}
