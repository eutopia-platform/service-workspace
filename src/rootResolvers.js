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
  }
})
const dbSchema = 'sc_work'
const select = async (from, where) => await knex.select().withSchema(dbSchema).from(from).where(where)
const selectSingle = async (from, where) => await select(from, where) |> (_ => #.length ?#[0] : null) ()

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

  createWorkspace: async ({name}, context) => {
    if (/[^a-zA-Z0-9]/.test(name))
      throw Error('INVALID_NAME')
    
    const user = await getUser(context)

    if (!user.isLoggedIn)
      throw Error('NOT_LOGGED_IN')

    const exists = await selectSingle('workspace', {name}) ? true : false
    if (exists)
      throw Error('ALREADY_EXISTS')

    let uid = randomString(8, { lower: true })
    while (await selectSingle('workspace', {uid}))
      uid = randomString(8, { lower: true })

    await knex.withSchema(dbSchema).into('workspace').insert({uid, name})
    await knex.schema.withSchema(dbSchema).createTable(`${uid}_member`, table => {
      table.string('uid', 20)
    })
    await knex.withSchema(dbSchema).into(`${uid}_member`).insert({uid: user.uid})

    return {
      name,
      id: uid,
    }
  },
}
