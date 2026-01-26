import type {
  LoginInput,
  SignupInput,
  AcceptInvitationInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from "@/types/__generated__/graphql";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { useNavigate } from "@tanstack/react-router";
import {
  ME_QUERY,
  LOGIN_MUTATION,
  SIGNUP_MUTATION,
  ACCEPT_INVITATION_MUTATION,
  FORGOT_PASSWORD_MUTATION,
  RESET_PASSWORD_MUTATION,
  CHANGE_PASSWORD_MUTATION,
  VERIFY_EMAIL_MUTATION,
  RESEND_VERIFICATION_EMAIL_MUTATION,
} from "@/lib/apollo/queries/auth";
import { isAuthenticated } from "@/utils/auth";

export function useAuth() {
  const client = useApolloClient();
  const navigate = useNavigate();

  const { data, loading, error } = useQuery(ME_QUERY, {
    errorPolicy: "all",
  });

  const hasToken = isAuthenticated();
  const effectiveLoading = loading && hasToken;

  const [loginMutation] = useMutation(LOGIN_MUTATION);
  const [signupMutation] = useMutation(SIGNUP_MUTATION);
  const [acceptInvitationMutation] = useMutation(ACCEPT_INVITATION_MUTATION);
  const [forgotPasswordMutation] = useMutation(FORGOT_PASSWORD_MUTATION);
  const [resetPasswordMutation] = useMutation(RESET_PASSWORD_MUTATION);
  const [changePasswordMutation] = useMutation(CHANGE_PASSWORD_MUTATION);
  const [verifyEmailMutation] = useMutation(VERIFY_EMAIL_MUTATION);
  const [resendVerificationEmailMutation] = useMutation(RESEND_VERIFICATION_EMAIL_MUTATION);

  const login = async (input: LoginInput) => {
    const { data } = await loginMutation({
      variables: { loginInput: input },
    });

    if (data?.login) {
      localStorage.setItem("accessToken", data.login.accessToken);
      localStorage.setItem("refreshToken", data.login.refreshToken);
      await client.resetStore();
    }
    return data?.login;
  };

  const signup = async (input: SignupInput) => {
    const { data } = await signupMutation({
      variables: { signupInput: input },
    });

    // No auto-login, just return data so UI can show success message
    return data?.signup;
  };

  const logout = async () => {
    try {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      await client.clearStore();
    } catch (error) {
      console.error("Error clearing store during logout:", error);
    } finally {
      navigate({ to: "/" });
    }
  };

  const acceptInvitation = async (input: AcceptInvitationInput) => {
    const { data } = await acceptInvitationMutation({
      variables: { acceptInvitationInput: input },
    });

    if (data?.acceptInvitation) {
      localStorage.setItem("accessToken", data.acceptInvitation.accessToken);
      localStorage.setItem("refreshToken", data.acceptInvitation.refreshToken);
      await client.resetStore();
    }
    return data?.acceptInvitation;
  };

  const forgotPassword = async (input: ForgotPasswordInput) => {
    const { data } = await forgotPasswordMutation({
      variables: { forgotPasswordInput: input },
    });
    return data?.forgotPassword;
  };

  const resetPassword = async (input: ResetPasswordInput) => {
    const { data } = await resetPasswordMutation({
      variables: { resetPasswordInput: input },
    });
    return data?.resetPassword;
  };

  const changePassword = async (input: ChangePasswordInput) => {
    const { data } = await changePasswordMutation({
      variables: { changePasswordInput: input },
    });
    return data?.changePassword;
  };

  const verifyEmail = async (token: string) => {
    const { data } = await verifyEmailMutation({
      variables: { token },
    });

    if (data?.verifyEmail) {
      localStorage.setItem("accessToken", data.verifyEmail.accessToken);
      localStorage.setItem("refreshToken", data.verifyEmail.refreshToken);
      await client.resetStore();
    }
    return data?.verifyEmail;
  };

  const resendVerificationEmail = async (email: string) => {
    const { data } = await resendVerificationEmailMutation({
      variables: { email },
    });
    return data?.resendVerificationEmail;
  };

  return {
    user: data?.me,
    loading: effectiveLoading,
    error,
    login,
    signup,
    logout,
    acceptInvitation,
    forgotPassword,
    resetPassword,
    changePassword,
    verifyEmail,
    resendVerificationEmail,
  };
}
