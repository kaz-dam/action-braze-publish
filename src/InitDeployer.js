const fs = require('fs')
const path = require('path')
const core = require('@actions/core')
const Constants = require('./Constants')

class InitDeployer {
    constructor(brazeClient) {
        this.brazeClient = brazeClient
        this.workspacePath = process.env.GITHUB_WORKSPACE
    }

    async deploy(contentBlockNames) {
        const files = this.getAllFiles(path.join(this.workspacePath, Constants.CONTENT_BLOCKS_DIR))

        for (const file of files) {
            const fileName = path.basename(file, path.extname(file))
            const content = fs.readFileSync(file, 'utf8')

            if (contentBlockNames.includes(fileName)) {
                await this.brazeClient.updateContentBlock(fileName, content)
            } else {
                await this.brazeClient.createContentBlock(fileName, content)
            }
        }
    }

    getAllFiles(dirPath, files = []) {
        const items = fs.readdirSync(dirPath)

        for (const item of items) {
            const fullPath = path.join(dirPath, item)

            if (fs.statSync(fullPath).isDirectory()) {
                this.getAllFiles(fullPath, files)
            } else if (Constants.FILE_EXTENSIONS.includes(path.extname(fullPath).slice(1))) {
                files.push(fullPath)
            }
        }

        return files
    }
}

module.exports = InitDeployer