const core = require('@actions/core')
const Constants = require('./Constants')

class UpdateDeployer {
    constructor(octokit, brazeClient, owner, repo, baseSha, headSha) {
        this.octokit = octokit
        this.brazeClient = brazeClient
        this.owner = owner
        this.repo = repo
        this.baseSha = baseSha
        this.headSha = headSha
    }

    async deploy(contentBlockNames) {
        core.info('Running Update Mode - Uploading changed or new content blocks.')

        const response = await this.octokit.rest.repos.compareCommits({
			owner: this.owner,
			repo: this.repo,
			base: this.baseSha,
			head: this.headSha
		})

        const files = response.data.files

        for (const file of files) {
            if (file.status === 'added' || file.status === 'modified') {
                const filePath = file.filename
                const fileName = filePath.split('/').pop().split('.').slice(0, -1).join('.')
                const fileExtension = filePath.split('.').pop()
                const isContentBlock = filePath.includes(Constants.CONTENT_BLOCKS_DIR)

                core.debug(`File: ${filePath}`)

                if (!isContentBlock) {
                    core.debug(`Skipping non-content block file: ${filePath}`)
                    continue
                }

                const contentResponse = await this.octokit.rest.repos.getContent({
                    owner: this.owner,
                    repo: this.repo,
                    path: filePath,
                    ref: this.headSha
                })

                const content = Buffer.from(contentResponse.data.content, 'base64').toString('utf8')

                if (contentBlockNames.includes(fileName)) {
                    core.debug(`Content block exists: ${fileName}`)

                    const apiResponseJson = await this.brazeClient.updateContentBlock(contentBlocks[fileName], content)

                    core.debug(`Content block updated: ${apiResponseJson.liquid_tag}`)
                } else {
                    core.debug(`Content block does not exist: ${fileName}`)
                    core.debug(`Creating content block: ${fileName}`)

                    const apiResponseJson = await this.brazeClient.createContentBlock(fileName, content)

                    if (apiResponseJson.message === 'success') {
                        core.debug(`Content block created: ${apiResponseJson.liquid_tag}`)
                    } else {
                        core.debug(`Content block content: ${content.substring(0, 50)}...`)
                        core.debug(`Failed to create content block: ${apiResponseJson.message}`)
                    }
                }
            }
        }
    }
}

module.exports = UpdateDeployer