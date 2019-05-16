import { auth, user as userService } from './interService'
import gql from 'graphql-tag'
import randomString from './randomString'
import { isValidEmail, sendInvitation as sendInviteEmail } from './mail'

const knex = require('knex')({
  client: 'pg',
  version: '10.6',
  connection: {
    host: process.env.DATABASE_URL,
    database: process.env.DATABASE_NAME,
    user: 'service_work',
    password: process.env.WORKSPACE_DATABASE_PASSWORD
  },
  searchPath: 'sc_work',
})

const select = async (from, where = {}) => await knex.from(from).where(where)
const selectSingle = async (from, where = {}) => await select(from, where) |> (_ => #.length ?#[0] : null) ()

const getUser = async ({ headers: { 'session-token': token } }) => {
  if (!token) throw Error('NOT_LOGGED_IN')
  return (await auth.query({
      query: gql`
          query authUser($token: ID!) {
            user(token: $token) {
              uid
            }
          }
        `,
      variables: {
        token
      }
    })).data.user
}

const spaceDbToGraph = (space, members) => ({
  name: space.name,
  created: space.created ? space.created.toISOString() : null,
  members: members ? members : [],
})

const getMembers = async uids => {
  return (await userService.query({
    query: gql`
      query members($uids: [ID!]!) {
        usersById(ids: $uids) {
          name
          callname
          email
          id
        }
      }
    `,
    variables: {
      uids
    }
  })).data.users
}

export default {
  hello: () => 'hello there!',

  workspaces: async (_, context) => {
    const user = await getUser(context)

    const spaceIds = await knex('workspace').select('uid').map(s => s.uid)
    const memberSpaces = (await Promise.all(
      spaceIds.map(async id => await knex(id + '_member').map(m => m.uid))
    ))
      .map(m => m.includes(user.uid))
      .map((v, i) => [spaceIds[i], v])
      .reduce((acc, c) => (c[1] ? acc.concat(c[0]) : acc), [])

    return await knex('workspace').whereIn('uid', memberSpaces).map(space => spaceDbToGraph(space))
  },

  workspace: async ({name}, context) => {
    const user = await getUser(context)

    let workspace = await selectSingle('workspace', {name})
    if (!workspace)
      workspace = (await knex('workspace').select()).find(
        e => e.name.toLowerCase() === name.toLowerCase()
      )
    if (!workspace) return
    
    const memberUids = await knex(workspace.uid + '_member').map(m => m.uid)
    const isMember = memberUids.some(uid => uid === user.uid)
    if (!isMember) return

    const members = await getMembers(memberUids)
    return spaceDbToGraph(workspace, members)
  },

  inviteSpaceName: async ({link}, context) => {
    const user = await getUser(context)

    const invite = await selectSingle('invitation', { link })
    if (!invite) throw Error('UNAUTHORIZED')

    if (user.uid !== invite.invitee) throw Error('UNAUTHORIZED')

    const space = await selectSingle('workspace', { uid: invite.workspace })
    if (!space) throw Error('WORKSPACE_GONE')

    return space.name
  },

  createWorkspace: async ({name}, context) => {
    if (/[^a-zA-Z0-9]/.test(name))
      throw Error('INVALID_NAME')
    
    const user = await getUser(context)

    const exists = (await knex('workspace').select('name'))
      .map(s => s.name.toLowerCase())
      .includes(name.toLowerCase())
    if (exists)
      throw Error('ALREADY_EXISTS')

    let uid = randomString(8, { lower: true })
    while (await selectSingle('workspace', {uid}))
      uid = randomString(8, { lower: true })

    await knex.into('workspace').insert({ uid, name, created: new Date().toISOString() })
    await knex.schema.createTable(`${uid}_member`, table => {
      table.string('uid', 20)
    })
    await knex.into(`${uid}_member`).insert({uid: user.uid})

    return {
      name,
    }
  },

  joinWorkspace: async({ inviteLink }, context) => {
    const user = await getUser(context)

    const invite = await selectSingle('invitation', { link: inviteLink })
    if (!invite) throw Error('UNAUTHORIZED')

    if (user.uid !== invite.invitee) throw Error('UNAUTHORIZED')

    const space = await selectSingle('workspace', { uid: invite.workspace })
    if (!space) throw Error('WORKSPACE_GONE')

    await knex(`${space.uid}_member`).insert({uid: invite.invitee})
    await knex('invitation').where({invitee: invite.invitee}).del()

    return {
      name: space.name,
      members: []
    }
  },

  invite: async ({workspace, email}, context) => {
    const space = await selectSingle('workspace', {name: workspace})
    if (!space) throw Error('UNAUTHORIZED')

    const user = await getUser(context)

    const memberUids = await knex(space.uid + '_member').map(m => m.uid)
    const isMember = memberUids.includes(user.uid)
    if (!isMember) throw Error('UNAUTHORIZED')

    if (!isValidEmail(email))
      throw Error('INVALID_EMAIL')

    const invitee = (await userService.query({
      query: gql`query getAccount($email: String!) {
        getUser(email: $email)
      }`,
      variables: {
        email
      },
    })).data.getUser

    if (!invitee) throw Error('NOT_USER')

    if (memberUids.includes(invitee)) throw Error('ALREADY_MEMBER')

    const alreadInvited = (await knex('invitation').select().where({invitee})).length > 0
    if (alreadInvited) throw Error('ALREADY_INVITED')

    let link
    do {
      link = randomString(6, {lower: true, number: true})
    } while ((await knex('invitation').where({link})).length > 0)

    await knex('invitation').insert({
      link: link,
      workspace: space.uid,
      invitee: invitee,
      issuer: user.uid,
      created: new Date().toISOString(),
    })

    const [ inviteeName, userName ] = (await userService.query({
      query: gql`query inviteeName($uidInvitee: ID!, $uidUser: ID!) {
        usersById(ids: [$uidInvitee, $uidUser]) {
          callname
        }
      }`,
      variables: {
        uidInvitee: invitee,
        uidUser: user.uid
      }
    })).data.users.map(user => user.callname)

    await sendInviteEmail(email, space.name, userName, inviteeName, `https://productcube.io/invite/${link}`)
  }
}
