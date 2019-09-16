const RemoveOutsideCollaborators = require('../../../lib/RemoveOutsideCollaborators')

describe('removeOutsideCollaborators', () => {
  let github

  function configure (payload, yaml) {
    return new RemoveOutsideCollaborators(github, { owner: 'Hollywood', repo: 'test', username: 'Usr45' }, payload, console, yaml)
  }

  let payloadRemoveCollaborator = { action: 'added', member: { login: 'Usr45' }, repository: { name: 'test', owner: { login: 'Usr45' } }, organization: { login: 'Albatoss' }, sender: { login: 'Usr45' } }

  beforeEach(() => {
    github = {
      repos: {
        removeCollaborator: jest.fn().mockImplementation(() => Promise.resolve()),
        getContent: jest.fn().mockImplementation(() => Promise.resolve())
      },
      issues: {
        create: jest.fn().mockImplementation(() => Promise.resolve([]))
      },
      orgs: {
        getOrgMembership: jest.fn().mockImplementation(() => Promise.resolve([]))
      }
    }
  })

  describe('update', () => {
    let spyIsOrgMember
    let spyExecuteRemoval
    let spyMonitorOnly

    beforeEach(() => {
      spyIsOrgMember = jest.spyOn(RemoveOutsideCollaborators.prototype, 'isRepoAddedByOrgMember')
      spyExecuteRemoval = jest.spyOn(RemoveOutsideCollaborators.prototype, 'executeRemoval')
      spyMonitorOnly = jest.spyOn(RemoveOutsideCollaborators.prototype, 'executeMonitorOnly')
    })
    afterEach(function () {
      spyIsOrgMember.mockClear()
      spyExecuteRemoval.mockClear()
      spyMonitorOnly.mockClear()
    })

    it('repo created by an org member', () => {
      expect(spyExecuteRemoval).not.toHaveBeenCalled()
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
        excludeCollaborators: ['Usr45']
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
        monitorIssueBody: '<h3 align="center">MonitorIssueBodyText</h3>'
        ccList: '@Security-Admin'
      `)
      let issueBody = config.formIssueBody(`<h3 align="center">${config.monitorIssueBody}</h3>`, '@Security-Admin')
      expect(issueBody).toEqual(`<h3 align="center">${config.monitorIssueBody}</h3>\n\n<p align="center">Collaborator added: <strong>Usr45</strong></p>\n\n---\n\n<h6 align="center">/cc @Security-Admin</h6>`)
    })

    it('formIssueBody with no ccList', () => {
      const config = configure(payloadRemoveCollaborator, ``)
      let issueBody = config.formIssueBody(`<h3 align="center">${config.monitorIssueBody}</h3>`, '')
      expect(issueBody).toEqual(`<h3 align="center">${config.monitorIssueBody}</h3>\n\n<p align="center">Collaborator added: <strong>Usr45</strong></p>\n\n---`)
    })
  })

  describe('createIssue', () => {
    it('createIssue with Title and Body', () => {
      const config = configure(payloadRemoveCollaborator, ``)
      config.createIssue('TitleTest', 'BodyTest')
      expect(github.issues.create).toHaveBeenCalledWith({
        owner: 'Hollywood',
        repo: 'test',
        title: 'TitleTest',
        body: 'BodyTest',
        username: 'Usr45'
      })
    })
  })

  describe('removeCollaborator', () => {
    it('removeCollaborator from repo', () => {
      const config = configure(payloadRemoveCollaborator, ``)
      config.removeCollaborator()
      expect(github.repos.removeCollaborator).toHaveBeenCalledWith({
        owner: 'Usr45',
        repo: 'test',
        username: 'Usr45'
      })
    })
  })

  describe('executeMonitorOnly', () => {
    it('executeMonitorOnly', () => {
      let spyFormIssueBody = jest.spyOn(RemoveOutsideCollaborators.prototype, 'formIssueBody')
      let spyCreateIssue = jest.spyOn(RemoveOutsideCollaborators.prototype, 'createIssue')
      const config = configure(payloadRemoveCollaborator, `
        monitorIssueBody: '<h3 align="center">MonitorIssueBodyText</h3>'
        ccList: '@Security-Admin'
        `)
      config.executeMonitorOnly({
        monitorIssueTitle: 'MonitorIssueTitleText',
        monitorIssueBody: 'MonitorIssueBodyText',
        ccList: '@Security-Admin'
      })
      expect(spyFormIssueBody).toHaveBeenCalledWith(`<h3 align="center">MonitorIssueBodyText</h3>`, '@Security-Admin')
      expect(spyCreateIssue).toHaveBeenCalled()
    })
  })

  describe('executeRemoval', () => {
    it('executeRemoval', () => {
      let spyFormIssueBody = jest.spyOn(RemoveOutsideCollaborators.prototype, 'formIssueBody')
      let spyCreateIssue = jest.spyOn(RemoveOutsideCollaborators.prototype, 'createIssue')
      let spyRemoveCollaborator = jest.spyOn(RemoveOutsideCollaborators.prototype, 'removeCollaborator')
      const config = configure(payloadRemoveCollaborator, `
        monitorIssueBody: '<h3 align="center">MonitorIssueBodyText</h3>'
        ccList: '@Security-Admin'
        `)
      config.executeRemoval({
        monitorIssueTitle: 'MonitorIssueTitleText',
        monitorIssueBody: `<h3 align="center">${config.monitorIssueBody}</h3>`,
        ccList: '@Security-Admin'
      })
      expect(spyFormIssueBody).toHaveBeenCalledWith('<h3 align="center">MonitorIssueBodyText</h3>', '@Security-Admin')
      expect(spyCreateIssue).toHaveBeenCalled()
      expect(spyRemoveCollaborator).toHaveBeenCalled()
    })
  })
})
