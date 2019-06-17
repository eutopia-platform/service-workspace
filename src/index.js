import { ApolloServer, gql } from 'apollo-server-micro'
import schema from './schema'
import resolvers from './resolvers'
import { auth as authService } from './interService'

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin':
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:1234'
      : 'https://productcube.io',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, session-token'
}

const printTitle = title =>
  void console.info(
    `\n${'—'.repeat(process.stdout.columns)}\n${' '.repeat(
      Math.floor((process.stdout.columns - title.length) / 2)
    )}${title}${' '.repeat(
      Math.ceil((process.stdout.columns - title.length) / 2)
    )}\n${'—'.repeat(process.stdout.columns)}\n`
  )

export default async (request, response) => {
  if (process.env.NODE_ENV === 'development') printTitle('WORKSPACE')

  if (request.method === 'OPTIONS') {
    response.writeHead(204, headers)
    response.end()
    return
  }

  Object.keys(headers).forEach(header =>
    response.setHeader(header, headers[header])
  )

  const sessionToken = request.headers['session-token'] || null

  const userId = !sessionToken
    ? null
    : (await authService.query({
        query: gql`
          query serviceWorkspaceUser($sessionToken: ID!) {
            user(sessionToken: $sessionToken) {
              id
            }
          }
        `,
        variables: { sessionToken }
      })).data.user.id

  const isService =
    request.headers.auth &&
    request.headers.auth === process.env.WORKSPACE_PASSWORD

  new ApolloServer({
    typeDefs: schema,
    resolvers,
    context: {
      userId,
      isService
    }
  }).createHandler({
    path: '/'
  })(request, response)
}
