import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { useNavigate } from "@tanstack/react-router";
import type {
  LoginInput,
  SignupInput,
  AcceptInvitationInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  User,
  LoginMutation,
  SignupMutation,
  AcceptInvitationMutation,
  VerifyEmailMutation,
} from "@/types/__generated__/graphql";
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

interface AuthContextType {
  user: User | null | undefined;
  loading: boolean;
  error: Error | undefined;
  login: (input: LoginInput) => Promise<LoginMutation["login"] | undefined>;
  signup: (input: SignupInput) => Promise<SignupMutation["signup"] | undefined>;
  logout: () => Promise<void>;
  acceptInvitation: (
    input: AcceptInvitationInput,
  ) => Promise<AcceptInvitationMutation["acceptInvitation"] | undefined>;
  forgotPassword: (input: ForgotPasswordInput) => Promise<boolean | undefined | null>;
  resetPassword: (input: ResetPasswordInput) => Promise<boolean | undefined | null>;
  changePassword: (input: ChangePasswordInput) => Promise<boolean | undefined | null>;
  verifyEmail: (token: string) => Promise<VerifyEmailMutation["verifyEmail"] | undefined>;
  resendVerificationEmail: (email: string) => Promise<boolean | undefined | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useApolloClient();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null | undefined>(undefined);

  const { data, loading, error } = useQuery(ME_QUERY, {
    errorPolicy: "all",
    fetchPolicy: "network-only", // Ensure we validate the token on mount
  });

  // Sync user state with query data when it changes
  useEffect(() => {
    if (data?.me) {
      setUser(data.me as User);
    } else if (!loading && !data?.me) {
      setUser(null);
    }
  }, [data, loading]);

  const [loginMutation] = useMutation(LOGIN_MUTATION);
  const [signupMutation] = useMutation(SIGNUP_MUTATION);
  const [acceptInvitationMutation] = useMutation(ACCEPT_INVITATION_MUTATION);
  const [forgotPasswordMutation] = useMutation(FORGOT_PASSWORD_MUTATION);
  const [resetPasswordMutation] = useMutation(RESET_PASSWORD_MUTATION);
  const [changePasswordMutation] = useMutation(CHANGE_PASSWORD_MUTATION);
  const [verifyEmailMutation] = useMutation(VERIFY_EMAIL_MUTATION);
  const [resendVerificationEmailMutation] = useMutation(RESEND_VERIFICATION_EMAIL_MUTATION);

  const login = useCallback(
    async (input: LoginInput) => {
      const { data } = await loginMutation({
        variables: { loginInput: input },
      });

      if (data?.login) {
        localStorage.setItem("accessToken", data.login.accessToken);
        localStorage.setItem("refreshToken", data.login.refreshToken);
        await client.resetStore();
        if (data.login.user) {
          setUser(data.login.user as User);
        }
      }
      return data?.login;
    },
    [loginMutation, client],
  );

  const signup = useCallback(
    async (input: SignupInput) => {
      const { data } = await signupMutation({
        variables: { signupInput: input },
      });
      return data?.signup;
    },
    [signupMutation],
  );

  const logout = useCallback(async () => {
    // Immediate UI update
    setUser(null);

    try {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      await client.clearStore();
    } catch (error) {
      console.error("Error clearing store during logout:", error);
    } finally {
      navigate({ to: "/" });
    }
  }, [client, navigate]);

  const acceptInvitation = useCallback(
    async (input: AcceptInvitationInput) => {
      const { data } = await acceptInvitationMutation({
        variables: { acceptInvitationInput: input },
      });

      if (data?.acceptInvitation) {
        localStorage.setItem("accessToken", data.acceptInvitation.accessToken);
        localStorage.setItem("refreshToken", data.acceptInvitation.refreshToken);
        await client.resetStore();
        if (data.acceptInvitation.user) {
          setUser(data.acceptInvitation.user as User);
        }
      }
      return data?.acceptInvitation;
    },
    [acceptInvitationMutation, client],
  );

  const forgotPassword = useCallback(
    async (input: ForgotPasswordInput) => {
      const { data } = await forgotPasswordMutation({
        variables: { forgotPasswordInput: input },
      });
      return data?.forgotPassword;
    },
    [forgotPasswordMutation],
  );

  const resetPassword = useCallback(
    async (input: ResetPasswordInput) => {
      const { data } = await resetPasswordMutation({
        variables: { resetPasswordInput: input },
      });
      return data?.resetPassword;
    },
    [resetPasswordMutation],
  );

  const changePassword = useCallback(
    async (input: ChangePasswordInput) => {
      const { data } = await changePasswordMutation({
        variables: { changePasswordInput: input },
      });
      return data?.changePassword;
    },
    [changePasswordMutation],
  );

  const verifyEmail = useCallback(
    async (token: string) => {
      const { data } = await verifyEmailMutation({
        variables: { token },
      });

      if (data?.verifyEmail) {
        localStorage.setItem("accessToken", data.verifyEmail.accessToken);
        localStorage.setItem("refreshToken", data.verifyEmail.refreshToken);
        await client.resetStore();
        if (data.verifyEmail.user) {
          setUser(data.verifyEmail.user as User);
        }
      }
      return data?.verifyEmail;
    },
    [verifyEmailMutation, client],
  );

  const resendVerificationEmail = useCallback(
    async (email: string) => {
      const { data } = await resendVerificationEmailMutation({
        variables: { email },
      });
      return data?.resendVerificationEmail;
    },
    [resendVerificationEmailMutation],
  );

  const hasToken = isAuthenticated();
  // We consider it loading if the query is loading AND we have a token (so we expect a user)
  // OR if we have a token but user state hasn't been resolved yet (undefined)
  const effectiveLoading = (loading && hasToken) || (hasToken && user === undefined);

  const value = {
    user,
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
