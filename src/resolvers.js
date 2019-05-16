import {
  AuthenticationError,
  ForbiddenError,
  UserInputError,
  ApolloError,
  gql
} from 'apollo-server-micro'
import crypto from 'crypto'
import { user as userService } from './interService'
import randomString from './randomString'

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
    },

    workspaces: async (root, args, context) => {
      if (!context.userId) throw new AuthenticationError('NOT_LOGGED_IN')
      const spaceIds = await knex('workspace')
        .select('uid')
        .map(s => s.uid)
      const memberSpaces = (await Promise.all(
        spaceIds.map(async id => await knex(id + '_member').map(m => m.uid))
      ))
        .map(m => m.includes(context.userId))
        .map((v, i) => [spaceIds[i], v])
        .reduce((acc, c) => (c[1] ? acc.concat(c[0]) : acc), [])

      return await knex('workspace').whereIn('uid', memberSpaces)
    },

    inviteSpaceName: async (root, { link }, context) => {
      const invite = await knex('invitation').where({ link })[0]
      if (!invite) throw new ForbiddenError()
      if (context.userId !== invite.invitee) throw new ForbiddenError()
      const space = await knex('workspace').where({ uid: invite.workspace })
      if (!space) throw new ApolloError('WORKSPACE_GONE')
      return space.name
    }
  },

  Mutation: {
    createWorkspace: async (root, { name }, context) => {
      if (!context.userId) throw new AuthenticationError('NOT_LOGGED_IN')
      if (/[^a-zA-Z0-9]/.test(name)) throw new UserInputError('INVALID_NAME')
      const exists = (await knex('workspace').select('name'))
        .map(s => s.name.toLowerCase())
        .includes(name.toLowerCase())
      if (exists) throw new UserInputError('ALREADY_EXISTS')

      let uid = randomString(8, { lower: true })
      while ((await knex('workspace').where({ uid }).length) > 0)
        uid = randomString(8, { lower: true })

      const space = (await knex
        .into('workspace')
        .insert({ uid, name, created: new Date().toISOString() })
        .returning('*'))[0]
      await knex.schema.createTable(`${uid}_member`, table => {
        table.string('uid', 20)
      })
      await knex.into(`${uid}_member`).insert({ uid: context.userId })
      return space
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
