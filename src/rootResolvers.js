import { graphql } from 'graphql'
import schema from './schema'
import { auth } from './interService'
import gql from 'graphql-tag'
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

const select = async (from, where = {}) => await knex.from(from).where(where)
const selectSingle = async (from, where = {}) => await select(from, where) |> (_ => #.length ?#[0] : null) ()

const getUser = async ({ headers: { 'session-token': token } }) => 
  !token
    ? { isLoggedIn: false }
    : (await auth.query({
      query: gql`
          query authUser($token: ID!) {
            user(token: $token) {
              isLoggedIn
              uid
            }
          }
        `,
      variables: {
        token
      }
    })).data.user

export default {
  hello: () => 'hello there!',

  workspaces: async (_, context) => {
    const user = await getUser(context)
    if (!user.isLoggedIn) throw Error('NOT_LOGGED_IN')

    const spaceIds = await knex('workspace').select('uid').map(s => s.uid)
    const memberSpaces = (await Promise.all(
      spaceIds.map(async id => await knex(id + '_member').map(m => m.uid))
    ))
      .map(m => m.includes(user.uid))
      .map((v, i) => [spaceIds[i], v])
      .reduce((acc, c) => (c[1] ? acc.concat(c[0]) : acc), [])

    return await knex('workspace').whereIn('uid', memberSpaces)
  },

  createWorkspace: async ({name}, context) => {
    if (/[^a-zA-Z0-9]/.test(name))
      throw Error('INVALID_NAME')
    
    const user = await getUser(context)

    if (!user.isLoggedIn)
      throw Error('NOT_LOGGED_IN')

    const exists = (await knex('workspace').select('name'))
      .map(s => s.name.toLowerCase())
      .includes(name.toLowerCase())
    if (exists)
      throw Error('ALREADY_EXISTS')

    let uid = randomString(8, { lower: true })
    while (await selectSingle('workspace', {uid}))
      uid = randomString(8, { lower: true })

    await knex.into('workspace').insert({uid, name})
    await knex.schema.createTable(`${uid}_member`, table => {
      table.string('uid', 20)
    })
    await knex.into(`${uid}_member`).insert({uid: user.uid})

    return {
      name,
      id: uid,
    }
  },
}
