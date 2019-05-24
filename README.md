# Workspace Service

## Installation & Usage Instruction

To install the dependencies run `npm install`

Build the service with `npm run build` and start it in development mode with `npm run start:dev`

Running the `start:dev` script expects a file named `secrete_setup.sh` to be present in the root directory of the repository. The script should export all environment variables that the service requires to run, i.e. `export VARIABLE=VALUE`. A list of the required environment variables can be found in the [`now.json`](now.json).

When running the service in development mode a graphical query interface ([GraphQL Playground](https://www.apollographql.com/docs/apollo-server/features/graphql-playground)) will be available in a web browser at the address the service is running on.

The current version on master gets automatically deployed to https://work.api.productcube.io
