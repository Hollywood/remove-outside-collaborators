const yaml = require('js-yaml')
const noOrgConfig = false

class RemoveOutsideCollaborators {
  static analyze (github, repo, payload, logger) {
    const defaults = require('./defaults')
    const orgRepo = (process.env.ORG_WIDE_REPO_NAME) ? process.env.ORG_WIDE_REPO_NAME : defaults.ORG_WIDE_REPO_NAME
    const filename = (process.env.FILE_NAME) ? process.env.FILE_NAME : defaults.FILE_NAME
    logger.info('Get config from: ' + repo.owner + '/' + orgRepo + '/' + filename)

    return github.repos.getContent({
      owner: repo.owner,
      repo: orgRepo,
      path: filename
    }).catch(() => ({
      noOrgConfig
    }))
      .then((orgConfig) => {
        if ('noOrgConfig' in orgConfig) {
          logger.log('NOTE: config file not found in: ' + orgRepo + '/' + filename + ', using defaults.')
          return new RemoveOutsideCollaborators(github, repo, payload, logger, '').update()
        } else {
          const content = Buffer.from(orgConfig.data.content, 'base64').toString()
          return new RemoveOutsideCollaborators(github, repo, payload, logger, content).update()
        }
      })
  }

  constructor (github, repo, payload, logger, config) {
    this.github = github
    this.repo = repo
    this.payload = payload
    this.logger = logger
    this.config = yaml.safeLoad(config)
  }

  update () {
    var configParams = Object.assign({}, require('./defaults'), this.config || {})

    if (this.isRemoveCollaboratorsDisabled(configParams.enableCollaboratorRemoval)) return

    if (this.isExcludedCollaborator(configParams.excludeCollaborators)) return

    if (!configParams.monitorOnly) {
      return this.executeRemoval(configParams)
    }

    return this.executeMonitorOnly(configParams)
  }

  isRemoveCollaboratorsDisabled (enableCollaboratorRemoval) {
    if (this.payload.action === 'added' && !enableCollaboratorRemoval) {
      this.logger.info('An Outside Collaborator was added to ' + this.repo.repo + ' but enableCollaboratorRemoval is set to false')
      return true
    }
    return false
  }

  isExcludedCollaborator(excludeCollaborators) {
    if (excludeCollaborators.includes(this.member.login)) {
      this.logger.info('Collaborator: ' + this.member.login + ' is part of the exclusion list')
      return true
    }
    return false
  }

  executeRemoval (configParams) {
    this.logger.info('Removing Collaborator: ' + this.member.login)

    var issueBody = this.formIssueBody(configParams.removedIssueTitle, configParams.ccList)
    this.createIssue(configParams.removedIssueTitle, issueBody)
    this.removeCollaborator()
  }

  executeMonitorOnly (configParams) {
    var issueBody = this.formIssueBody(configParams.monitorIssueBody, configParams.ccList)
    this.createIssue(configParams.monitorIssueTitle, issueBody)
  }

  formIssueBody (body, ccList) {
    const owner = this.payload.sender.login
    var issueBody = body + '\n\n/cc @' + owner
    issueBody += (ccList) ? '\n/cc ' + ccList : ''
    return issueBody
  }

  createIssue (title, body) {
    const issueParams = {
      title: title,
      body: body
    }
    const createIssueParams = Object.assign({}, this.repo, issueParams || {})
    this.github.issues.create(createIssueParams)
  }

  removeCollaborator () {
    const removeParams = {
      owner: this.payload.repository.owner.login,
      repo: this.payload.repository.name,
      username: this.payload.member.login
    }
    const toRemovalParams = Object.assign({}, this.repo, removeParams || {})
    this.github.repos.removeCollaborator(toRemovalParams)
  }
}

module.exports = RemoveOutsideCollaborators
