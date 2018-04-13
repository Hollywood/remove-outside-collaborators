const RemoveOutsideCollaborators = require('../../../lib/RemoveOutsideCollaborators')

describe('removeOutsideCollaborators', () => {
  let github

  function configure (payload, yaml) {
    return new RemoveOutsideCollaborators(github, {owner: 'hollywood', repo: 'test', username: 'usr45'}, payload, console, yaml)
  }

  beforeEach(() => {
    github = {
      repos: {
        removeCollaborator: jest.fn().mockImplementation(() => Promise.resolve()),
        getContent: jest.fn().mockImplementation(() => Promise.resolve())
      },
      issues: {
        create: jest.fn().mockImplementation(() => Promise.resolve([]))
      }
    }

    payloadRemoveCollaborator = {
      action: 'added',
      member: {
        login: 'usr45'
      },
      repository: {
        name: 'test',
        owner: {
          login: 'hollywood'
        }
      },
      sender: {
        login: 'hollywood'
      }
    }
  })

  describe('update', () => {
    beforeEach(() => {
      spyExecuteRemoval = jest.spyOn(RemoveOutsideCollaborators.prototype, 'executeRemoval')
      spyMonitorOnly = jest.spyOn(RemoveOutsideCollaborators.prototype, 'executeMonitorOnly')
    })
    afterEach(function () {
      spyExecuteRemoval.mockClear()
      spyMonitorOnly.mockClear()
    })

    it('added and enableCollaboratorRemoval is disabled', () => {
      const config = configure(payloadRemoveCollaborator, `
        monitorOnly: true
        enableCollaboratorRemoval: false
      `)
      config.update()
      expect(spyExecuteRemoval).not.toHaveBeenCalled()
      expect(spyMonitorOnly).toHaveBeenCalled()
    })

    it('added and enableCollaboratorRemoval is enabled', () => {
      const config = configure(payloadRemoveCollaborator, `
        monitorOnly: true
        enableCollaboratorRemoval: true
      `)
      config.update()
      expect(spyExecuteRemoval).not.toHaveBeenCalled()
      expect(spyMonitorOnly).toHaveBeenCalled()
    })

    it('added and the collaborator is whitelisted', () => {
      const config = configure(payloadRemoveCollaborator, `
        excludeCollaborators: ["usr45"]
      `)
      config.update()
      expect(spyExecuteRemoval).not.toHaveBeenCalled()
      expect(spyMonitorOnly).not.toHaveBeenCalled()
    })

    it('added and the collaborator is not whitelisted', () => {
      const config = configure(payloadRemoveCollaborator, `
        monitorOnly: true
        excludeCollaborators: ['test-pro2', test-pro3]
      `)
      config.update()
      expect(spyExecuteRemoval).not.toHaveBeenCalled()
      expect(spyMonitorOnly).toHaveBeenCalled()
    })

    it('added collaborator and app is in monitorOnly mode', () => {
      const config = configure(payloadRemoveCollaborator, `
        monitorOnly: true
        monitorIssueTitle: 'Monitor Only Mode! '
      `)
      config.update()
      expect(spyExecuteRemoval).not.toHaveBeenCalled()
      expect(spyMonitorOnly).toHaveBeenCalled()
    })

    it('added collaborator and monitorOnly mode is disabled', () => {
      const config = configure(payloadRemoveCollaborator, `
        monitorOnly: false
      `)
      config.update()
      expect(spyExecuteRemoval).toHaveBeenCalled()
      expect(spyMonitorOnly).not.toHaveBeenCalled()
    })
  })

  describe('formIssueBody', () => {
    it('formIssueBody with ccList', () => {
      const config = configure(payloadRemoveCollaborator, `
        ccList: "@Security-Admin"
      `)
      var issueBody = config.formIssueBody('test123', '@Security-Admin')
      expect(issueBody).toEqual('test123\n\n/cc @hollywood\n/cc @Security-Admin')
    })

    it('formIssueBody with no ccList', () => {
      const config = configure(payloadRemoveCollaborator, ``)
      var issueBody = config.formIssueBody('test123', '')
      expect(issueBody).toEqual('test123\n\n/cc @hollywood')
    })
  })

  describe('createIssue', () => {
    it('creatIssue with Title and Body', () => {
      const config = configure(payloadRemoveCollaborator, ``)
      config.createIssue('TitleTest', 'BodyTest')
      expect(github.issues.create).toHaveBeenCalledWith({
        owner: 'hollywood',
        repo: 'test',
        title: 'TitleTest',
        body: 'BodyTest',
        username: 'usr45'
      })
    })
  })

  describe('removeCollaborator', () => {
    it('removeCollaborator from repo', () => {
      const config = configure(payloadRemoveCollaborator, ``)
      config.removeCollaborator()
      expect(github.repos.removeCollaborator).toHaveBeenCalledWith({
        owner: 'hollywood',
        repo: 'test',
        username: 'usr45'
      })
    })
  })

  describe('executeMonitorOnly', () => {
    it('executeMonitorOnly', () => {
      var spyFormIssueBody = jest.spyOn(RemoveOutsideCollaborators.prototype, 'formIssueBody')
      var spyCreateIssue = jest.spyOn(RemoveOutsideCollaborators.prototype, 'createIssue')
      const config = configure(payloadRemoveCollaborator, `
        monitorIssueBody: "MonitorIssueBodyText"
        ccList: "@Security-Admin"
        `)
      config.executeMonitorOnly({
        monitorIssueTitle: 'MonitorIssueTitleText',
        monitorIssueBody: 'MonitorIssueBodyText',
        ccList: '@Security-Admin'
      })
      expect(spyFormIssueBody).toHaveBeenCalledWith('MonitorIssueBodyText', '@Security-Admin')
      expect(spyCreateIssue).toHaveBeenCalled()
    })
  })

  describe('executeRemoval', () => {
    it('executeRemoval', () => {
      var spyFormIssueBody = jest.spyOn(RemoveOutsideCollaborators.prototype, 'formIssueBody')
      var spyCreateIssue = jest.spyOn(RemoveOutsideCollaborators.prototype, 'createIssue')
      var spyRemoveCollaborator = jest.spyOn(RemoveOutsideCollaborators.prototype, 'removeCollaborator')
      const config = configure(payloadRemoveCollaborator, `
        monitorIssueBody: "MonitorIssueBodyText"
        ccList: "@Security-Admin"
        `)
      config.executeRemoval({
        monitorIssueTitle: 'MonitorIssueTitleText',
        monitorIssueBody: 'MonitorIssueBodyText',
        ccList: '@Security-Admin'
      })
      expect(spyFormIssueBody).toHaveBeenCalledWith('MonitorIssueBodyText', '@Security-Admin')
      expect(spyCreateIssue).toHaveBeenCalled()
      expect(spyRemoveCollaborator).toHaveBeenCalled()
    })
  })
})
