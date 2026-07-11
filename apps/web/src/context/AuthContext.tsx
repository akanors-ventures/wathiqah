import type { ApolloClient } from "@apollo/client";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { deleteCookie } from "@/lib/cookies";
import type {
  AcceptInvitationInput,
  AcceptInvitationMutation,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  LoginMutation,
  MeQuery,
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
  refetch: () => Promise<ApolloClient.QueryResult<MeQuery>>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useApolloClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const isPublicOnboarding = useMemo(() => {
    const publicPaths = [
      "/",
      "/login",
      "/signup",
      "/signup-success",
      "/verify-email",
      "/forgot-password",
      "/reset-password",
      "/features",
      "/pricing",
      "/shared-access",
      "/witnesses/invite",
    ];
    return publicPaths.some(
      (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
    );
  }, [location.pathname]);

  const { data, loading, error, refetch } = useQuery(ME_QUERY, {
    errorPolicy: "all",
    fetchPolicy: "network-only", // Ensure we validate the token on mount
    skip: isPublicOnboarding && !isAuthenticated(),
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
          // Use clearStore instead of resetStore to avoid "Invariant Violation: Store reset while query
          // was in flight". clearStore wipes the cache without re-fetching active queries immediately.
          // Follow up with refetchQueries so persistent providers (OrgContext, etc.) that were active
          // during the unauthenticated phase re-run with the new JWT and populate correctly — without
          // this, MY_ORGANISATIONS_QUERY stays empty until the user refreshes the page.
          client
            .clearStore()
            .then(() => client.refetchQueries({ include: "active" }))
            .catch((err) => {
              console.error("Error clearing store after login:", err);
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
    // Immediate UI update
    setUser(null);

    deleteCookie("isLoggedIn");

    // Navigate BEFORE invalidating tokens: window.location.pathname becomes "/"
    // so the Apollo errorLink sees isPublicPath = true for any errors triggered
    // by clearStore re-firing network-only queries — preventing the refresh loop.
    navigate({ to: "/" });

    try {
      // Always call the server logout so clearCookies() runs with the correct
      // cookieDomain config, clearing any domain-scoped isLoggedIn cookie that
      // client-side deleteCookie() cannot reach. The mutation is not behind
      // GqlAuthGuard and is safe to call without an active session.
      await logoutMutation();
    } catch (error) {
      console.error("Error during logout mutation:", error);
    } finally {
      await client.clearStore();
    }
  }, [client, navigate, logoutMutation]);

  // Sync user state with query data when it changes
  useEffect(() => {
    if (data?.me) {
      setUser(data.me as User);
    } else if (!loading) {
      // If we have an explicit authentication error, or if we thought we were
      // authenticated but the session cookie is gone, trigger a full logout.

      let hasAuthError = false;
      if (CombinedGraphQLErrors.is(error)) {
        hasAuthError = error.errors.some(
          ({ extensions, message }) =>
            extensions?.code === "UNAUTHENTICATED" ||
            extensions?.code === "UNAUTHORIZED" ||
            message?.toLowerCase().includes("unauthorized"),
        );
      }

      const wasAuthenticated = userRef.current !== null && userRef.current !== undefined;
      const hasCookie = isAuthenticated();

      // Guard: use userRef instead of `user` state so this effect is NOT in the
      // dependency array for `user`. If `user` were a dep, setUser(null) in logout
      // would re-run this effect while data?.me is still cached, immediately
      // restoring the user and causing the dashboard to remount — triggering
      // clearStore to re-fire authenticated queries and creating a logout loop.
      if ((hasAuthError || (wasAuthenticated && !hasCookie)) && userRef.current !== null) {
        console.debug("[AuthContext] Unauthenticated state detected, triggering logout cleanup");
        setUser(null);
        logout();
      } else if (userRef.current === undefined) {
        // ME_QUERY settled without yielding a user and without matching a
        // recognized auth-failure shape (e.g. a transient network error
        // rather than a classified UNAUTHENTICATED response). Resolve to
        // null anyway so effectiveLoading — which gates purely on
        // `user !== undefined` — doesn't hang forever waiting for a signal
        // that will never come on this request.
        setUser(null);
      }
    }
  }, [data, loading, error, logout]);

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
          client
            .clearStore()
            .then(() => client.refetchQueries({ include: "active" }))
            .catch((err) => {
              console.error("Error clearing store after accept invitation:", err);
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
          client.clearStore().catch((err) => {
            console.error("Error clearing store after verify email:", err);
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
  // `user === undefined` alone captures this — it's only ever true before the sync effect below has run once.
  // Deliberately NOT also requiring ME_QUERY's own `loading`: that flag flips to false as soon as the response
  // lands, one render before the effect actually calls setUser(data.me) — during that single frame `loading`
  // would already read false while `user` is still undefined, letting callers (e.g. Pro-gated redirects) act on
  // an incomplete answer. `user === undefined` alone has no such gap and doesn't reintroduce loading screens on
  // refetches, since those only happen once `user` already holds a real value.
  const effectiveLoading = hasToken && user === undefined;

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
    refetch,
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
