const fs = require('fs')
const path = require('path')
const Constants = require('./Constants')
const BaseDeployer = require('./BaseDeployer')
const Logger = require('./Logger')

class InitDeployer extends BaseDeployer {
    constructor(brazeClient) {
        super()
        this.brazeClient = brazeClient
        this.workspacePath = process.env.GITHUB_WORKSPACE

        Logger.info('Initializing the InitDeployer')
        Logger.debug(`Workspace path: ${this.workspacePath}`)
    }

    async deploy() {
        Logger.info('Deploying content blocks in the init mode')

        const files = this.getAllFiles(path.join(this.workspacePath, Constants.CONTENT_BLOCKS_DIR))

        this.publishFiles(files)

        Logger.info('Content blocks deployed successfully')
    }

    getAllFiles(dirPath, files = []) {
        const items = fs.readdirSync(dirPath)

        for (const item of items) {
            const fullPath = path.join(dirPath, item)

            if (fs.statSync(fullPath).isDirectory()) {
                this.getAllFiles(fullPath, files)
            } else if (Constants.FILE_EXTENSIONS.includes(path.extname(fullPath).slice(1))) {
                files.push({
                    path: fullPath,
                    content: fs.readFileSync(fullPath, 'utf8')
                })
            }
        }

        return files
    }
}

module.exports = InitDeployer