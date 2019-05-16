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

export default async (request, response) => {
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
          query sessionUser($sessionToken: ID!) {
            user(token: $sessionToken) {
              uid
            }
          }
        `,
        variables: {
          sessionToken
        }
      })).data.user.uid

  new ApolloServer({
    typeDefs: schema,
    resolvers,
    context: {
      userId,
    }
  }).createHandler({
    path: '/'
  })(request, response)
}
