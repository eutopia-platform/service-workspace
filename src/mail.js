import { mail } from './interService'
import gql from 'graphql-tag'

export const isValidEmail = email =>
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
    email
  )

export const sendInvitation = async (address, space, fromName) => {
  await mail.mutate({
    mutation: gql`
      mutation sendInvitation(
        $sender: String!
        $receiver: String!
        $subject: String!
        $text: String!
        $html: String
      ) {
        sendEmail(
          sender: $sender
          receiver: $receiver
          subject: $subject
          text: $text
          html: $html
        )
      }
    `,
    variables: {
      sender: 'Productcube',
      receiver: address,
      subject: `${fromName} invited you to join the ${space} workspace`,
      text: `Hello,

${fromName} invited you to join the ${space} workspace on cube.

To accept the invitation, please create an account with this email at:
https://productcube.io/signup

In case you don't know ${fromName} or don't want to join the ${space} workspace, you don't have to anything and can safely delete this message.


Have a nice day!`,
      html: `<p>
        Hello,<br>
        <br>
        ${fromName} invited you to join the ${space} workspace on cube.<br>
        To accept the invitation, <a href="https://productcube.io/signup">please create an account with this email.</a>.<br>
        <br>
        In case you don't know ${fromName} or don't want to join the ${space} workspace, you don't have to anything and can safely delete this message.<br>
        <br>
        Have a nice day!        
      </p>`
    }
  })
}
