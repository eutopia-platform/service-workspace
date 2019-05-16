import { AuthenticationError, UserInputError, gql } from 'apollo-server-micro'
import crypto from 'crypto'
import { user as userService } from './interService'

const knex = require('knex')({
  client: 'pg',
  version: '10.6',
  connection: {
    host: process.env.DATABASE_URL,
    database: process.env.DATABASE_NAME,
    user: 'service_work',
    password: process.env.WORKSPACE_DATABASE_PASSWORD
  },
  searchPath: 'sc_work'
})

export default {
  Query: {
    hello: () => 'workspace service says hello',

    workspace: async (root, { name }, context) => {
      if (!context.userId) throw new AuthenticationError('NOT_LOGGED_IN')

      let workspace = (await knex('workspace').where({ name }))[0]
      if (!workspace)
        workspace = (await knex('workspace').select()).find(
          e => e.name.toLowerCase() === name.toLowerCase()
        )
      if (!workspace)
        throw new UserInputError(`workspace with name "${name}" doesn't exist`)

      return workspace
    }
  },

  Workspace: {
    created: ({ created }) => (created ? created.toISOString() : null),
    members: async ({ uid }) => {
      return (await userService.query({
        query: gql`
          query getUsers($ids: [ID!]!) {
            usersById(ids: $ids) {
              id
              name
              callname
              email
            }
          }
        `,
        variables: {
          ids: await knex(`${uid}_member`).map(user => user.uid)
        }
      })).data.usersById
    }
  },

  User: {
    id: user =>
      crypto
        .createHash('sha256')
        .update(user.id)
        .digest('base64')
  }
}
