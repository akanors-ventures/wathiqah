import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { useNavigate } from "@tanstack/react-router";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import {
  ACCEPT_INVITATION_MUTATION,
  CHANGE_PASSWORD_MUTATION,
  FORGOT_PASSWORD_MUTATION,
  LOGIN_MUTATION,
  LOGOUT_MUTATION,
  ME_QUERY,
  RESEND_VERIFICATION_EMAIL_MUTATION,
  RESET_PASSWORD_MUTATION,
  SIGNUP_MUTATION,
  VERIFY_EMAIL_MUTATION,
} from "@/lib/apollo/queries/auth";
import type {
  AcceptInvitationInput,
  AcceptInvitationMutation,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  LoginMutation,
  ResetPasswordInput,
  SignupInput,
  SignupMutation,
  User,
  VerifyEmailMutation,
} from "@/types/__generated__/graphql";
import { isAuthenticated } from "@/utils/auth";
import { deleteCookie } from "@/lib/cookies";
import { CombinedGraphQLErrors } from "@apollo/client/errors";

interface AuthContextType {
  user: User | null | undefined;
  loading: boolean;
  isAuthenticated: () => boolean;
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

  const [loginMutation] = useMutation(LOGIN_MUTATION);
  const [signupMutation] = useMutation(SIGNUP_MUTATION);
  const [logoutMutation] = useMutation(LOGOUT_MUTATION);
  const [acceptInvitationMutation] = useMutation(ACCEPT_INVITATION_MUTATION);
  const [forgotPasswordMutation] = useMutation(FORGOT_PASSWORD_MUTATION);
  const [resetPasswordMutation] = useMutation(RESET_PASSWORD_MUTATION);
  const [changePasswordMutation] = useMutation(CHANGE_PASSWORD_MUTATION);
  const [verifyEmailMutation] = useMutation(VERIFY_EMAIL_MUTATION);
  const [resendVerificationEmailMutation] = useMutation(RESEND_VERIFICATION_EMAIL_MUTATION);

  const login = useCallback(
    async (input: LoginInput) => {
      try {
        const { data } = await loginMutation({
          variables: { loginInput: input },
        });

        if (data?.login) {
          if (data.login.user) {
            setUser(data.login.user as User);
          }
          // Don't await resetStore to avoid hanging the UI.
          // It will refetch active queries in the background.
          client.resetStore().catch((err) => {
            console.error("Error resetting store after login:", err);
          });
        }
        return data?.login;
      } catch (error) {
        console.error("Login mutation error:", error);
        throw error;
      }
    },
    [loginMutation, client],
  );

  const signup = useCallback(
    async (input: SignupInput) => {
      try {
        const { data } = await signupMutation({
          variables: { signupInput: input },
        });
        return data?.signup;
      } catch (error) {
        console.error("Signup mutation error:", error);
        throw error;
      }
    },
    [signupMutation],
  );

  const logout = useCallback(async () => {
    // If we're already clearing out, don't double-call
    const wasAuthenticated = user !== null && user !== undefined;

    // Immediate UI update
    setUser(null);

    deleteCookie("isLoggedIn");

    try {
      // Only attempt mutation if we thought we were authenticated
      if (wasAuthenticated) {
        await logoutMutation().catch(() => {
          /* ignore errors during logout */
        });
      }
      await client.clearStore();
    } catch (error) {
      console.error("Error clearing store during logout:", error);
    } finally {
      navigate({ to: "/" });
    }
  }, [client, navigate, logoutMutation, user]);

  // Sync user state with query data when it changes
  useEffect(() => {
    if (data?.me) {
      setUser(data.me as User);
    } else if (!loading && (error || !data?.me)) {
      const wasAuthenticated = user !== null && user !== undefined;
      setUser(null);

      // If we thought we were logged in but the server says otherwise,
      // or if we have an unauthenticated error, trigger a full logout cleanup.
      let hasAuthError = false;
      if (CombinedGraphQLErrors.is(error)) {
        hasAuthError = error.errors.some(
          ({ extensions, message }) =>
            extensions?.code === "UNAUTHENTICATED" ||
            extensions?.code === "UNAUTHORIZED" ||
            message?.toLowerCase().includes("unauthorized"),
        );
      }

      if (hasAuthError || (!data?.me && wasAuthenticated)) {
        console.debug("[AuthContext] Unauthenticated state detected, triggering logout cleanup");
        logout();
      }
    }
  }, [data, loading, error, logout, user]);

  const acceptInvitation = useCallback(
    async (input: AcceptInvitationInput) => {
      try {
        const { data } = await acceptInvitationMutation({
          variables: { acceptInvitationInput: input },
        });

        if (data?.acceptInvitation) {
          if (data.acceptInvitation.user) {
            setUser(data.acceptInvitation.user as User);
          }
          client.resetStore().catch((err) => {
            console.error("Error resetting store after accept invitation:", err);
          });
        }
        return data?.acceptInvitation;
      } catch (error) {
        console.error("Accept invitation mutation error:", error);
        throw error;
      }
    },
    [acceptInvitationMutation, client],
  );

  const forgotPassword = useCallback(
    async (input: ForgotPasswordInput) => {
      try {
        const { data } = await forgotPasswordMutation({
          variables: { forgotPasswordInput: input },
        });
        return data?.forgotPassword;
      } catch (error) {
        console.error("Forgot password mutation error:", error);
        throw error;
      }
    },
    [forgotPasswordMutation],
  );

  const resetPassword = useCallback(
    async (input: ResetPasswordInput) => {
      try {
        const { data } = await resetPasswordMutation({
          variables: { resetPasswordInput: input },
        });
        return data?.resetPassword;
      } catch (error) {
        console.error("Reset password mutation error:", error);
        throw error;
      }
    },
    [resetPasswordMutation],
  );

  const changePassword = useCallback(
    async (input: ChangePasswordInput) => {
      try {
        const { data } = await changePasswordMutation({
          variables: { changePasswordInput: input },
        });
        return data?.changePassword;
      } catch (error) {
        console.error("Change password mutation error:", error);
        throw error;
      }
    },
    [changePasswordMutation],
  );

  const verifyEmail = useCallback(
    async (token: string) => {
      try {
        const { data } = await verifyEmailMutation({
          variables: { token },
        });

        if (data?.verifyEmail) {
          if (data.verifyEmail.user) {
            setUser(data.verifyEmail.user as User);
          }
          client.resetStore().catch((err) => {
            console.error("Error resetting store after verify email:", err);
          });
        }
        return data?.verifyEmail;
      } catch (error) {
        console.error("Verify email mutation error:", error);
        throw error;
      }
    },
    [verifyEmailMutation, client],
  );

  const resendVerificationEmail = useCallback(
    async (email: string) => {
      try {
        const { data } = await resendVerificationEmailMutation({
          variables: { email },
        });
        return data?.resendVerificationEmail;
      } catch (error) {
        console.error("Resend verification email mutation error:", error);
        throw error;
      }
    },
    [resendVerificationEmailMutation],
  );

  const hasToken = isAuthenticated();
  // We consider it loading if we have a token (isLoggedIn cookie) but user state hasn't been resolved yet (undefined).
  // We don't use 'loading' from useQuery here to avoid redundant loading screens during store resets/refetches
  // if we already have a user object in state.
  const effectiveLoading = hasToken && user === undefined && loading;

  const value = {
    user,
    loading: effectiveLoading,
    isAuthenticated,
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
