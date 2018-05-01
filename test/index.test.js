const {createRobot} = require('probot')
const plugin = require('../index')
const payload = require('./fixtures/events/collaborator.added.json')

describe('plugin', () => {
  let robot, event, github

  beforeEach(() => {
    robot = createRobot()
    github = {
      issues: {
        create: jest.fn()
      },
      repos: {
        getContent: jest.fn(),
        removeCollaborator: jest.fn()
      }
    }
    robot.auth = () => Promise.resolve(github)
    plugin(robot)

    event = { event: 'member', payload }
  })

  it('opens an issue', async () => {
    await robot.receive(event)
    expect(github.issues.create).toHaveBeenCalled()
    expect(github.issues.create.mock.calls[0][0]).toMatchSnapshot()
  })

  it('removes the added collaborator', async () => {
    await robot.receive(event)
    expect(github.repos.removeCollaborator).toHaveBeenCalledWith({
      owner: 'hollywood',
      repo: 'test',
      username: 'usr45'
    })
  })

  it.only('does not remove the collaborator in monitorOnly mode', async () => {
    const content = Buffer.from('monitorOnly: true', 'utf8')
    github.repos.getContent.mockReturnValueOnce(Promise.resolve({ data: { content } }))
    await robot.receive(event)
    expect(github.repos.removeCollaborator).not.toHaveBeenCalled()
  })
})
