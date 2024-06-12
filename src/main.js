const core = require('@actions/core')
const github = require('@actions/github')
const { HttpClient } = require('@actions/http-client')

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
    const httpClient = new HttpClient()

    const owner = context.repo.owner
    const repo = context.repo.repo
    const sha = context.sha

    const response = await octokit.rest.repos.getCommit({
      owner,
      repo,
      ref: sha
    })

    const files = response.data.files

    for (const file of files) {
      if (file.status === 'added' || file.status === 'modified') {
        core.debug(`File: ${file.filename}`)

        const contentResponse = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: file.filename,
          ref: sha
        })

        const content = Buffer.from(contentResponse.data.content, 'base64').toString('utf8')

        // TODO: get list of existing content blocks
        // TODO: check if content block exists
        // TODO: create content block if it doesn't exist
        // TODO: update content block if it does exist

        const postData = JSON.stringify({
          content_block_id: '12345678-1234-1234-1234-123456789012',
          content
        });

        const apiResponse = await httpClient.post(`${brazeRestEndpoint}/templates`, postData, {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${brazeApiKey}`
        })

        if (apiResponse.message.statusCode !== 200) {
          throw new Error(`Failed to send data to API: ${apiResponse.message.statusCode}`);
        }

        const apiResponseData = await apiResponse.readBody()
        const apiResponseJson = JSON.parse(apiResponseData)

        core.debug(`Content block updated: ${apiResponseJson.liquid_tag}`)
      }
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
