class BaseDeployer {
    constructor(brazeClient) {
        this.brazeClient = brazeClient
        this.fileMap = new Map()
        this.resolved = new Set()
        this.dependencyGraph = new Map()
        this.orderedFiles = []
    }

    resolveDependencies(files, existingBlocks) {
        this.createDependencyGraph(files)

        for (const fileName of this.dependencyGraph.keys()) {
            this.resolveFile(fileName, existingBlocks)
        }

        return this.orderedFiles
    }

    resolveFile(fileName, existingContentBlocks = []) {
        if (this.resolved.has(fileName)) return

        const dependencies = this.getDependencyGraph(fileName)

        for (const dependency of dependencies) {
            if (this.resolved.has(dependency) && existingContentBlocks.includes(dependency)) continue
            
            if (!this.fileMap.has(dependency)) {
                throw new Error(`Referenced content block '${dependency}' does not exist in the repository or Braze.`)
            }

            this.resolveFile(dependency, existingContentBlocks)
        }

        this.trackFileNames(fileName)
    }

    createDependencyGraph(files) {
        for (const file of files) {
            const fileName = this.getContentBlockName(file.path)
            const content = file.content

            this.fileMap.set(fileName, file)

            const dependencies = this.extractReferences(content)
            this.dependencyGraph.set(fileName, dependencies)
        }
    }

    getDependencyGraph(fileName) {
        return this.dependencyGraph.get(fileName) || []
    }

    trackFileNames(fileName) {
        if (this.fileMap.has(fileName)) {
            this.orderedFiles.push(this.fileMap.get(fileName))
            this.resolved.add(fileName)
        }
    }

    extractReferences(content) {
        const regex = /\{\{content_blocks\.\$\{([\w-]+)\}\}\}/g
        const references = []
        let match

        while ((match = regex.exec(content)) !== null) {
            references.push(match[1])
        }

        return references
    }

    getContentBlockName(filePath) {
        return filePath.split('/').pop().split('.').slice(0, -1).join('.')
    }
}

module.exports = BaseDeployer