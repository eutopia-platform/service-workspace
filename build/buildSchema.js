const fs = require('fs-extra')
const transformAsync = require('@babel/core').transformAsync

async function writeSchema(content) {
  try {
    await fs.writeFile(`./dist/schema.js`, content)
  } catch (e) {
    console.error(
      `There was an error writing './dist/schema.js'. Try rebuilding.`
    )
  }
}

async function main() {
  const content =
    `import {buildSchema} from 'graphql'
    
    export default buildSchema(\`` +
    (await fs.readFile('./src/schema.graphql')) +
    '`)'

  const transpiled = (await transformAsync(content)).code

  try {
    await fs.mkdir('./dist')
  } catch (e) {
    console.log("Directory './dist' appears to exist already.")
  }

  try {
    await writeSchema(transpiled)
  } catch (e) {
    console.error(e)
  }
}

main()
