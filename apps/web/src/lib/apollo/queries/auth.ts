import type {
	AcceptInvitationMutation,
	AcceptInvitationMutationVariables,
	ChangePasswordMutation,
	ChangePasswordMutationVariables,
	ForgotPasswordMutation,
	ForgotPasswordMutationVariables,
	LoginMutation,
	LoginMutationVariables,
	MeQuery,
	MeQueryVariables,
	ResetPasswordMutation,
	ResetPasswordMutationVariables,
	SignupMutation,
	SignupMutationVariables,
	VerifyEmailMutation,
	VerifyEmailMutationVariables,
} from "@/types/__generated__/graphql";
import { gql, type TypedDocumentNode } from "@apollo/client";

export const ME_QUERY: TypedDocumentNode<MeQuery, MeQueryVariables> = gql`
  query Me {
    me {
      id
      email
      name
    }
  }
`;

export const LOGIN_MUTATION: TypedDocumentNode<
	LoginMutation,
	LoginMutationVariables
> = gql`
  mutation Login($loginInput: LoginInput!) {
    login(loginInput: $loginInput) {
      accessToken
      refreshToken
      user {
        id
        email
        name
      }
    }
  }
`;

export const SIGNUP_MUTATION: TypedDocumentNode<
	SignupMutation,
	SignupMutationVariables
> = gql`
  mutation Signup($signupInput: SignupInput!) {
    signup(signupInput: $signupInput) {
      accessToken
      refreshToken
      user {
        id
        email
        name
      }
    }
  }
`;

export const ACCEPT_INVITATION_MUTATION: TypedDocumentNode<
	AcceptInvitationMutation,
	AcceptInvitationMutationVariables
> = gql`
  mutation AcceptInvitation($acceptInvitationInput: AcceptInvitationInput!) {
    acceptInvitation(acceptInvitationInput: $acceptInvitationInput) {
      accessToken
      refreshToken
      user {
        id
        email
        name
      }
    }
  }
`;

export const FORGOT_PASSWORD_MUTATION: TypedDocumentNode<
	ForgotPasswordMutation,
	ForgotPasswordMutationVariables
> = gql`
  mutation ForgotPassword($forgotPasswordInput: ForgotPasswordInput!) {
    forgotPassword(forgotPasswordInput: $forgotPasswordInput)
  }
`;

export const RESET_PASSWORD_MUTATION: TypedDocumentNode<
	ResetPasswordMutation,
	ResetPasswordMutationVariables
> = gql`
  mutation ResetPassword($resetPasswordInput: ResetPasswordInput!) {
    resetPassword(resetPasswordInput: $resetPasswordInput)
  }
`;

export const CHANGE_PASSWORD_MUTATION: TypedDocumentNode<
	ChangePasswordMutation,
	ChangePasswordMutationVariables
> = gql`
  mutation ChangePassword($changePasswordInput: ChangePasswordInput!) {
    changePassword(changePasswordInput: $changePasswordInput)
  }
`;

export const VERIFY_EMAIL_MUTATION: TypedDocumentNode<
	VerifyEmailMutation,
	VerifyEmailMutationVariables
> = gql`
  mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token) {
      accessToken
      refreshToken
      user {
        id
        email
        name
      }
    }
  }
`;
