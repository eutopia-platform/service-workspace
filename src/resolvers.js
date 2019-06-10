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
import { isValidEmail, sendInvitation as sendInviteEmail } from './mail'
import uuid from 'uuid/v4'

const knex = require('knex')({
  client: 'pg',
  version: '10.6',
  connection: {
    host: process.env.DATABASE_URL,
    database: process.env.DATABASE_NAME,
    user: 'service_work',
    password: process.env.WORKSPACE_DATABASE_PASSWORD
  },
  searchPath: 'schema_workspace'
})

const validWorkspaceName = name =>
  name.length >= 3 &&
  /^[a-z0-9_-]+$/i.test(name) &&
  !/^[_-]|[_-]$/.test(name) &&
  !/([_-])\1+/.test(name)

const usersById = async ids =>
  (await userService.query({
    query: gql`
      query workspaceMembers($ids: [ID!]!) {
        usersById(ids: $ids) {
          id
          name
          callname
          email
        }
      }
    `,
    variables: {
      ids
    }
  })).data.usersById

export default {
  Query: {
    hello: () => 'workspace service says hello',

    workspace: async (root, { name }, { userId }) => {
      if (!userId) throw new AuthenticationError('NOT_LOGGED_IN')
      const space = (await knex('workspace').where({ name }))[0]
      if (!space) throw new UserInputError('DOES_NOT_EXIST')
      if (!space.members.includes(userId))
        throw new ForbiddenError('NOT_MEMBER')
      return space
    },

    workspaces: async (root, args, { userId }) => {
      if (!userId) throw new AuthenticationError('NOT_LOGGED_IN')
      return (await knex('workspace').select()).filter(space =>
        space.members.includes(userId)
      )
    }
  },

  Mutation: {
    createWorkspace: async (root, { name }, context) => {
      if (!context.userId) throw new AuthenticationError('NOT_LOGGED_IN')
      if (!validWorkspaceName(name)) throw new UserInputError('INVALID_NAME')
      if (
        (await knex('workspace').select('name'))
          .map(s => s.name.toLowerCase())
          .includes(name.toLowerCase())
      )
        throw new UserInputError('ALREADY_EXISTS')

      return (await knex('workspace')
        .insert({
          id: uuid(),
          name,
          members: [context.userId],
          invited: [],
          created: knex.fn.now()
        })
        .returning('*'))[0]
    },

    // invite: async (root, { workspace, email }, context) => {
    //   if (!context.userId) throw new AuthenticationError('NOT_LOGGED_IN')
    //   const space = (await knex('workspace').where({ name: workspace }))[0]
    //   if (!space) throw new ForbiddenError()

    //   const memberUids = await knex(space.uid + '_member').map(m => m.uid)
    //   const isMember = memberUids.includes(context.userId)
    //   if (!isMember) throw new ForbiddenError()

    //   if (!isValidEmail(email)) throw new UserInputError('INVALID_EMAIL')

    //   let invitee = (await userService.query({
    //     query: gql`
    //       query getAccount($email: String!) {
    //         usersByEmail(emails: [$email]) {
    //           id
    //         }
    //       }
    //     `,
    //     variables: {
    //       email
    //     }
    //   })).data.usersByEmail[0]

    //   console.log('invitee:', invitee)

    //   if (!invitee) throw new UserInputError('NOT_USER')
    //   invitee = invitee.id

    //   if (memberUids.includes(invitee))
    //     throw new UserInputError('ALREADY_MEMBER')

    //   const alreadInvited =
    //     (await knex('invitation')
    //       .select()
    //       .where({ workspace, invitee })).length > 0

    //   if (alreadInvited) throw new UserInputError('ALREADY_INVITED')

    //   let link
    //   do {
    //     link = randomString(6, { lower: true, number: true })
    //   } while ((await knex('invitation').where({ link })).length > 0)

    //   await knex('invitation').insert({
    //     link: link,
    //     workspace: space.uid,
    //     invitee: invitee,
    //     issuer: context.userId,
    //     created: new Date().toISOString()
    //   })

    //   const [inviteeName, userName] = (await userService.query({
    //     query: gql`
    //       query inviteeName($uidInvitee: ID!, $uidUser: ID!) {
    //         usersById(ids: [$uidInvitee, $uidUser]) {
    //           callname
    //         }
    //       }
    //     `,
    //     variables: {
    //       uidInvitee: invitee,
    //       uidUser: context.userId
    //     }
    //   })).data.usersById.map(user => user.callname)

    //   await sendInviteEmail(
    //     email,
    //     space.name,
    //     userName,
    //     inviteeName,
    //     `https://productcube.io/invite/${link}`
    //   )
    // },

    // joinWorkspace: async (root, { inviteLink }, context) => {
    //   return
    //   if (!context.userId) throw new AuthenticationError('NOT_LOGGED_IN')
    //   const invite = (await knex('invitation').where({ link: inviteLink }))[0]
    //   if (!invite) throw new ForbiddenError()
    //   if (invite.invitee !== context.userId) throw new ForbiddenError()

    //   const space = (await knex('workspace').where({
    //     uid: invite.workspace
    //   }))[0]
    //   if (!space) throw new ApolloError('WORKSPACE_GONE')

    //   await knex(`${space.uid}_member`).insert({ uid: invite.invitee })
    //   await knex('invitation')
    //     .where({ invitee: invite.invitee })
    //     .del()

    //   return (await knex('workspace').where({ uid: space.uid }))[0]
    // },

    deleteWorkspace: async (root, { name }, { userId }) => {
      if (!userId) throw new ForbiddenError()
      const space = (await knex('workspace').where({ name }))[0]
      if (!space) throw new ForbiddenError()
      if (
        !(await knex('workspace')
          .select('members')
          .where({ name }))[0].members.includes(userId)
      )
        throw new ForbiddenError()
      await knex('workspace')
        .where({ id: space.id })
        .del()
    }
  },

  Workspace: {
    created: ({ created }) => (created ? created.toISOString() : null),
    members: async ({ members }) => await usersById(members),
    invited: async ({ invited }) => await usersById(invited)
  },

  User: {
    id: user =>
      crypto
        .createHash('sha256')
        .update(user.id)
        .digest('base64')
  }
}
