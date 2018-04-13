const yaml = require('js-yaml')
const noOrgConfig = false

class RemoveOutsideCollaborators {
  static analyze (github, repo, payload, logger) {
    const defaults = require('./defaults')
    const orgRepo = (process.env.ORG_WIDE_REPO_NAME) ? process.env.ORG_WIDE_REPO_NAME : defaults.ORG_WIDE_REPO_NAME
    const filename = (process.env.FILE_NAME) ? process.env.FILE_NAME : defaults.FILE_NAME

    return github.repos.getContent({
      owner: repo.owner,
      repo: orgRepo,
      path: filename
    }).catch(() => ({
      noOrgConfig
    }))
      .then((orgConfig) => {
        if ('noOrgConfig' in orgConfig) {
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

    if (this.isRemoveCollaboratorsDisabled(configParams.enableCollaboratorRemoval, configParams.monitorOnly)) return

    if (this.isExcludedCollaborator(configParams.excludeCollaborators)) return

    if (!configParams.monitorOnly) {
      return this.executeRemoval(configParams)
    }

    return this.executeMonitorOnly(configParams)
  }

  isRemoveCollaboratorsDisabled (enableCollaboratorRemoval, monitorOnly) {
    if (this.payload.action === 'added' && !enableCollaboratorRemoval && !monitorOnly) {
      return true
    }
    return false
  }

  isExcludedCollaborator(excludeCollaborators) {
    if (excludeCollaborators.includes(this.payload.member.login)) {
      return true
    }
    return false
  }

  executeRemoval (configParams) {
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
      repo: this.repo.repo,
      username: this.payload.member.login
    }
    const toRemovalParams = Object.assign({}, this.repo, removeParams || {})
    this.github.repos.removeCollaborator(toRemovalParams)
  }
}

module.exports = RemoveOutsideCollaborators
