import { graphql } from 'graphql'
import schema from './schema'

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

export default {
  hello: () => 'hello there!',

  createWorkspace: async({name}) => {
    const exists = await selectSingle('workspace', {name}) ? true : false
    if (exists)
      throw new Error('ALREADY_EXISTS')
    await knex.withSchema(dbSchema).into('workspace').insert({name})
  }
}
