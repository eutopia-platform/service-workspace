import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { HttpLink } from 'apollo-link-http'
import { onError } from 'apollo-link-error'
import { ApolloLink } from 'apollo-link'
import fetch from 'node-fetch'

function service(url, headers) {
  return new ApolloClient({
    link: ApolloLink.from([
      onError(({ graphQLErrors, networkError }) => {
        if (graphQLErrors)
          graphQLErrors.map(({ message, locations, path }) =>
            console.log(
              `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
            )
          )
        if (networkError) console.log(`[Network error]: ${networkError}`)
      }),
      new HttpLink({
        uri: url,
        credentials: 'same-origin',
        fetch,
        headers
      })
    ]),
    cache: new InMemoryCache()
  })
}

export const auth = service(
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:4000'
    : 'https://auth.api.productcube.io',
  { auth: process.env.AUTH_PASSWORD }
)

export const user = service(
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:5000'
    : 'https://user.api.productcube.io',
  { auth: process.env.USER_PASSWORD }
)
