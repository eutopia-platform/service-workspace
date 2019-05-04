import url from 'url'
import { graphql } from 'graphql'
import schema from './schema'
import rootResolvers from './rootResolvers'
import { json } from 'micro'
import headers from './headers'
import connections from './connections'

const getArguments = async request => {
  switch (request.method) {
    case 'POST':
      return json(request)
    case 'GET':
      return url.parse(request.url, true).query
    default:
      throw new Error('Invalid request method')
  }
}

const sendWithStatusCode = (response, status, headers, data) => {
  response.writeHead(status, headers)
  response.end(data)
}

const getSendError = response => e =>
  ({ errors: { message: e.message } }
    |> JSON.stringify
    |> sendWithStatusCode(response, 401, headers, #))

const main = async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, headers)
    response.end()
    return
  }

  const sendError = getSendError(response)

  try {
    const args = await getArguments(request)

    const context = {
      connections: connections,
      headers: request.headers
    }
    const query = args.query
    const variables = args.variables
    const operationName = args.operationName

      ; (await graphql(
        schema,
        query,
        rootResolvers,
        context,
        variables,
        operationName
      ))
        |> JSON.stringify
        |> sendWithStatusCode(response, 200, headers, #)
  } catch (e) {
    sendError(e)
  }
}

export default (req, res) => {
  main(req, res)
}
