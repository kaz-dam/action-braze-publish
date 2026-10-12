const Logger = require('./Logger')
const Constants = require('./Constants')

class BaseDeployer {
	constructor(brazeClient) {
		this.brazeClient = brazeClient
		this.fileMap = new Map()
		this.resolved = new Set()
		this.dependencyGraph = new Map()
		this.orderedFiles = []

		this.existingContentBlocks = []
		this.contentBlocksWithIds = {}
		this.brazeContentBlockPrefix = ''
		this.createProdContentBlockForNewFiles = false
	}

	addPrefixToContentBlockName(contentBlockName, brazeContentBlockPrefix) {
		return brazeContentBlockPrefix
			? `${brazeContentBlockPrefix}${contentBlockName}`
			: contentBlockName
	}

	async publishFiles(files) {
		const resolvedFiles = this.resolveDependencies(
			files,
			this.existingContentBlocks
		)

		for (const file of resolvedFiles) {
			const contentBlockName = this.getContentBlockName(file.path)
			const prefixedContentBlockName = this.addPrefixToContentBlockName(
				contentBlockName,
				this.brazeContentBlockPrefix
			)

			Logger.debug(
				`Processing content block file ${prefixedContentBlockName}`
			)

			if (this.existingContentBlocks.includes(prefixedContentBlockName)) {
				await this.brazeClient.updateContentBlock(
					this.contentBlocksWithIds[prefixedContentBlockName],
					file.content
				)
				Logger.debug(
					`Content block ${prefixedContentBlockName} updated`
				)
			} else {
				await this.brazeClient.createContentBlock(
					prefixedContentBlockName,
					file.content
				)
				Logger.debug(
					`Content block ${prefixedContentBlockName} created`
				)
			}

			await this.createProdContentBlock(contentBlockName, file)
		}
	}

	async createProdContentBlock(contentBlockName, file) {
		if (!this.shouldCreateProdContentBlock(contentBlockName, file)) {
			return
		}

		// Other blocks in this publish still reference the unprefixed name.
		// Creating that prod block now lets Braze resolve those references.
		await this.brazeClient.createContentBlock(
			contentBlockName,
			file.content
		)
		this.existingContentBlocks.push(contentBlockName)
		Logger.debug(`Content block ${contentBlockName} created with prod name`)
	}

	shouldCreateProdContentBlock(contentBlockName, file) {
		if (!this.createProdContentBlockForNewFiles) {
			return false
		}

		if (file.status !== Constants.ADDED_FILE_STATUS) {
			return false
		}

		if (!this.brazeContentBlockPrefix) {
			return false
		}

		if (this.existingContentBlocks.includes(contentBlockName)) {
			Logger.debug(
				`Prod content block ${contentBlockName} already exists`
			)
			return false
		}

		return true
	}

	setContentBlockProperties(
		existingContentBlocks,
		contentBlocksWithIds,
		brazeContentBlockPrefix = '',
		createProdContentBlockForNewFiles = false
	) {
		this.existingContentBlocks = existingContentBlocks
		this.contentBlocksWithIds = contentBlocksWithIds
		this.brazeContentBlockPrefix = brazeContentBlockPrefix
		this.createProdContentBlockForNewFiles =
			createProdContentBlockForNewFiles
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
			if (
				this.resolved.has(dependency) &&
				existingContentBlocks.includes(dependency)
			)
				continue

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
