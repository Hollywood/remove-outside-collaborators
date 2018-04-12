module.exports = (robot, _, RemoveOutsideCollaborators = require('./lib/RemoveOutsideCollaborators')) => {
  robot.on('*', async context => {
    return RemoveOutsideCollaborators.analyze(context.github, context.repo(), context.payload, robot.log)
  })
}
