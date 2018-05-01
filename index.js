const yaml = require('js-yaml')
const defaults = require('./lib/defaults')
const template = require('./lib/template')

module.exports = robot => {
  robot.on('member.added', async context => {
    const member = context.payload.member.login
    const orgRepo = process.env.ORG_WIDE_REPO_NAME || defaults.ORG_WIDE_REPO_NAME
    const filename = process.env.FILE_NAME || defaults.FILE_NAME

    let cfg = {}

    try {
      const orgConfig = await context.github.repos.getContent(context.repo({
        repo: orgRepo,
        path: filename
      }))

      const content = Buffer.from(orgConfig.data.content, 'base64').toString()
      cfg = yaml.safeLoad(content)
    } catch (e) {
      context.log.error(e)
    }

    const config = { ...defaults, ...cfg }

    if (!config.enableCollaboratorRemoval && !config.monitorOnly) return
    if (config.excludeCollaborators.includes(member)) return

    const title = config.removedIssueTitle
    const body = template({
      body: config.removedIssueBody,
      owner: context.payload.sender.login,
      ccList: config.ccList
    })

    if (config.monitorOnly) {
      return context.github.issues.create(context.repo({ title, body }))
    } else {
      await context.github.issues.create(context.repo({ title, body }))
      return context.github.repos.removeCollaborator(context.repo({ username: member }))
    }
  })
}
