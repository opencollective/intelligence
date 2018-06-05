
const { request } = require('graphql-request');

const { getCollectives, saveCollectives } = require('./lib/db');

const getMembersQuery = `
  query Members($collectiveSlug: String!, $role: String, $type: String, $limit: Int, $offset: Int, $orderBy: String) {
    allMembers(collectiveSlug: $collectiveSlug, role: $role, type: $type, limit: $limit, offset: $offset, orderBy: $orderBy) {
      id
      role
      createdAt
      collective {
        name
      }
      stats {
        totalDonations
      }
      tier {
        id
        name
      }
      member {
        id
        type
        name
        company
        description
        slug
        image
        backgroundImage
        website
      }
    }
  }`;

getCollectives().then(async collectives => {
  for (const collective of Object.values(collectives)) {
    if (typeof collective.sponsors !== 'undefined') {
      continue;
    }
    console.log(collective);
    const params = {
      collectiveSlug: collective.slug,
      role: 'BACKER',
      type: 'ORGANIZATION',
      limit: 10,
      orderBy: 'totalDonations'
    };
    await request('https://opencollective.com/api/graphql', getMembersQuery, params)
      .then(data => {
        collective.sponsors = [];
        for (const { member, stats } of data.allMembers) {
          collective.sponsors.push({
            id: member.id,
            type: member.type,
            slug: member.slug,
            name: member.name,
            totalDonations: stats.totalDonations
          })
        }
      })
      .catch(err => {
        console.error(err.message);
      })
    // save Collectives
    await saveCollectives(collectives);
  }

});

