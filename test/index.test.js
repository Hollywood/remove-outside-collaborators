const { createRobot } = require('probot')
const plugin = require('../index')

describe('plugin', () => {
  let robot
  let event
  let analyze

  beforeEach(() => {
    robot = createRobot()
    robot.auth = () => Promise.resolve({})

    analyze = jest.fn()

    plugin(robot, {}, { analyze })
  })

  describe('analyzes on added collaborator', () => {
    beforeEach(() => {
      event = {
        event: 'member',
        payload: JSON.parse(JSON.stringify(require('./fixtures/events/collaborator.added.json')))
      }
    })
    it('analyzes member', async () => {
      await robot.receive(event)
      expect(analyze).toHaveBeenCalled()
    })
  })
})
