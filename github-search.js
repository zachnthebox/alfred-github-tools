'use strict';
const alfy = require('alfy');
const { request } = require('graphql-request');

const max_results = 10;
const access_token = process.env.GITHUB_API_KEY;
const graphQLEndpoint = `https://api.github.com/graphql?access_token=${access_token}`;
const query = `
  {
    search(type: REPOSITORY, query: "${alfy.input} in:name org:FigureTechnologies", first: 10) {
      nodes {
        ... on Repository {
          name
          nameWithOwner
          url
          owner {
            login
          }
          releases(first: 20, orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes {
              isPrerelease,
              isDraft,
              author {
                name
              }
              tagName
            }
          }
        }
      }
    }
  }
`;

function findLatestRelease(releases) {
  return releases.find(release => !release.isPrerelease);
}

(async () => {
  const data = await request(graphQLEndpoint, query);
  const results = [];

  const repos = data.search.nodes;

  for (let repo of repos) {
    const releases = repo.releases.nodes;
    const latestRelease = findLatestRelease(releases) || {};
    const mostRecentRelease = (releases.length && releases[0]) || {};

    const tagNameDisplay = (latestRelease.tagName && `(${latestRelease.tagName})`) || '';
    const title = `${repo.name} ${tagNameDisplay}`;
    const subtitle = repo.owner.login;
    const arg = repo.url;
    const result = {
      title,
      subtitle,
      arg,
    };

    let altSubtitle = '';
    if (mostRecentRelease.tagName) {
      if (latestRelease === mostRecentRelease) {
        altSubtitle = `No pending releases available`;
      } else {
        altSubtitle = `Pending Release - ${mostRecentRelease.tagName} by ${mostRecentRelease.author.name}`;
      }
    }

    result.mods = {
      cmd: {
        subtitle: 'Open in Visual Studio code',
        arg: repo.name,
      },
      alt: {
        subtitle: altSubtitle,
      },
    };

    results.push(result);
  }

  alfy.output(results);
})();
