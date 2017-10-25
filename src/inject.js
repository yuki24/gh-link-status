const repositoryNamePattern = /https:\/\/github\.com\/([A-Za-z0-9_\-.]+)\/([A-Za-z0-9_\-.]+)\/(issues|pull)\/(\d+)/

const handlers = {
  open: linkElement => linkElement.className += ' State State--green',
  closed: linkElement => linkElement.className += ' State State--red',
  merged: linkElement => linkElement.className += ' State State--purple'
}

const styleLabel = element => {
  element.style['font-size'] = '12px'
  element.style['padding'] = '0 5px'
  element.style['line-height'] = 'inherit'
}

const getIssue = (owner, repo, issueId, isIssue) =>
  fetch(`https://api.github.com/repos/${owner}/${repo}/${isIssue ? 'issues' : 'pulls'}/${issueId}`)
    .then(res => (res.ok ? res.json() : res.json().then(e => { throw Error(e.message) })))

chrome.extension.sendMessage({}, response => {
  const readyStateCheckInterval = setTimeout(() => {
    if (document.readyState === "complete") {
      document.querySelectorAll('a.issue-link').forEach(linkToIssue => {
        const parsed = repositoryNamePattern.exec(linkToIssue['href'])

        if (!parsed) {
          console.log(`failed to parse url: ${linkToIssue['href']}`)
          return
        }

        const [name, owner, repo, issueType, issueId, ...unused] = parsed

        getIssue(owner, repo, issueId, issueType === 'issues')
          .then(issue => {
            handlers[issue.merged ? 'merged' : issue.state](linkToIssue)
            styleLabel(linkToIssue)
          })
          .catch(e => console.log(`GH link status error: ${e.message}`))
      })
    }
  }, 1000)
})
