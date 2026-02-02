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
    } else if (!loading && (error || !data?.me)) {
      setUser(null);
      // If we thought we were logged in but the server says otherwise,
      // we should clear the cookie to prevent redirect loops
      // if (typeof document !== "undefined" && document.cookie.includes("isLoggedIn=")) {
      //   document.cookie = "isLoggedIn=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      // }
    }
  }, [data, loading, error]);

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
    // if (typeof document !== "undefined") {
    //   document.cookie = "isLoggedIn=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    // }

    try {
      await logoutMutation();
      await client.clearStore();
    } catch (error) {
      console.error("Error clearing store during logout:", error);
    } finally {
      navigate({ to: "/" });
    }
  }, [client, navigate, logoutMutation]);

  const acceptInvitation = useCallback(
    async (input: AcceptInvitationInput) => {
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
        if (data.verifyEmail.user) {
          setUser(data.verifyEmail.user as User);
        }
        client.resetStore().catch((err) => {
          console.error("Error resetting store after verify email:", err);
        });
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
  // We consider it loading if we have a token (isLoggedIn cookie) but user state hasn't been resolved yet (undefined).
  // We don't use 'loading' from useQuery here to avoid redundant loading screens during store resets/refetches
  // if we already have a user object in state.
  const effectiveLoading = hasToken && user === undefined;

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
