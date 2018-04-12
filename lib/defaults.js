module.exports = {
  monitorOnly: false,
  enableCollaboratorRemoval: true,
  removedIssueTitle: '[CRITICAL] An Outside Collaborator has been removed!',
  removedIssueBody: 'NOTE: Outside Collaborators cannot be added to this Org. Please contact an Admin to override.',
  ccList: '',
  excludeCollaborators: [],
  FILE_NAME: '.github/remove-outside-collaborators.yml',
  ORG_WIDE_REPO_NAME: 'org-settings'
}
