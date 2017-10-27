const repositoryNamePattern = /https:\/\/github\.com\/([A-Za-z0-9_\-.]+)\/([A-Za-z0-9_\-.]+)\/(issues|pull)\/(\d+)/

const sanitize = str => str.replace('-', '_').replace('.', '_')

const removeDuplicateIssues = issues =>
  Array.from(issues.reduce((m, t) => m.set(t.owner + t.repo + t.issueId, t), new Map()).values())

const GRAPHQL_QUERY = issues => `
  {
    ${removeDuplicateIssues(issues).map(({ owner, repo, issueId }) => `
      ${[sanitize(owner), sanitize(repo), issueId].join('_')}: repository(owner: "${owner}", name: "${repo}") {
        issueOrPullRequest(number: ${issueId}) {
          ...issueFields
          ...pullRequestFields
        }
      }
    `)}
  }

  fragment issueFields on Issue {
    state
  }

  fragment pullRequestFields on PullRequest {
    state
    merged
  }
`

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

const fetchIssues = issues => {
  fetch("https://api.github.com/graphql", {
    method: 'post',
    headers: {
      Authorization: "bearer 8d53022f104dae137e5cc2daa6f768b1d0f7b16d"
    },
    body: JSON.stringify({
      query: GRAPHQL_QUERY(issues)
    })
  })
    .then(res => (res.ok ? res.json() : res.json().then(e => { throw Error(e.message) })))
}

chrome.extension.sendMessage({}, response => {
  const readyStateCheckInterval = setTimeout(() => {
    if (document.readyState === "complete") {
      const issues = []
      document.querySelectorAll('a.issue-link').forEach(linkToIssue => {
        const parsed = repositoryNamePattern.exec(linkToIssue['href'])

        if (!parsed) {
          console.log(`failed to parse url: ${linkToIssue['href']}`)
          return
        }

        const [name, owner, repo, issueType, issueId, ...unused] = parsed
        issues.push({ owner, repo, issueId })
      })

      debugger
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
