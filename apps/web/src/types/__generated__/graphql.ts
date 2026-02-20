export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: string; output: string; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
};

export type AcceptInvitationInput = {
  password: Scalars['String']['input'];
  token: Scalars['String']['input'];
};

export type AccessGrant = {
  __typename: 'AccessGrant';
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  expiresAt: Maybe<Scalars['DateTime']['output']>;
  granter: Maybe<User>;
  id: Scalars['String']['output'];
  status: AccessStatus;
  token: Scalars['String']['output'];
};

export enum AccessStatus {
  Accepted = 'ACCEPTED',
  Pending = 'PENDING',
  Revoked = 'REVOKED'
}

export type AcknowledgeWitnessInput = {
  status: WitnessStatus;
  token?: InputMaybe<Scalars['String']['input']>;
  witnessId?: InputMaybe<Scalars['ID']['input']>;
};

export type AddWitnessInput = {
  transactionId: Scalars['ID']['input'];
  witnessInvites?: InputMaybe<Array<WitnessInviteInput>>;
  witnessUserIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export enum AssetCategory {
  Funds = 'FUNDS',
  Item = 'ITEM'
}

export type AuthPayload = {
  __typename: 'AuthPayload';
  accessToken: Maybe<Scalars['String']['output']>;
  refreshToken: Maybe<Scalars['String']['output']>;
  user: User;
};

export type ChangePasswordInput = {
  currentPassword: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
};

export type CheckoutSession = {
  __typename: 'CheckoutSession';
  sessionId: Maybe<Scalars['String']['output']>;
  url: Scalars['String']['output'];
};

export type Contact = {
  __typename: 'Contact';
  balance: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  email: Maybe<Scalars['String']['output']>;
  firstName: Scalars['String']['output'];
  hasPendingInvitation: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  isOnPlatform: Scalars['Boolean']['output'];
  lastName: Scalars['String']['output'];
  name: Scalars['String']['output'];
  phoneNumber: Maybe<Scalars['String']['output']>;
  transactions: Maybe<Array<Transaction>>;
  user: User;
  userId: Scalars['String']['output'];
};

export type ContactGroupedSummary = {
  __typename: 'ContactGroupedSummary';
  contact: Maybe<Contact>;
  summary: TransactionsSummary;
};

export type ContactPlatformStatus = {
  __typename: 'ContactPlatformStatus';
  isOnPlatform: Scalars['Boolean']['output'];
  linkedUserId: Maybe<Scalars['String']['output']>;
};

export type Contribution = {
  __typename: 'Contribution';
  amount: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  currency: Scalars['String']['output'];
  donor: Maybe<User>;
  donorEmail: Maybe<Scalars['String']['output']>;
  donorId: Maybe<Scalars['String']['output']>;
  donorName: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isAnonymous: Scalars['Boolean']['output'];
  message: Maybe<Scalars['String']['output']>;
  paymentProvider: Maybe<Scalars['String']['output']>;
  paymentRef: Maybe<Scalars['String']['output']>;
  status: ContributionStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export type ContributionOption = {
  __typename: 'ContributionOption';
  amount: Scalars['Float']['output'];
  currency: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
};

export enum ContributionStatus {
  Failed = 'FAILED',
  Pending = 'PENDING',
  Successful = 'SUCCESSFUL'
}

export type CreateContactInput = {
  email?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
};

export type CreateContributionInput = {
  amount: Scalars['Float']['input'];
  currency?: Scalars['String']['input'];
  donorEmail?: InputMaybe<Scalars['String']['input']>;
  donorName?: InputMaybe<Scalars['String']['input']>;
  isAnonymous?: Scalars['Boolean']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
  paymentProvider?: InputMaybe<Scalars['String']['input']>;
};

export type CreateProjectInput = {
  budget?: InputMaybe<Scalars['Float']['input']>;
  currency?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreatePromiseInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  description: Scalars['String']['input'];
  dueDate: Scalars['DateTime']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<Priority>;
  promiseTo: Scalars['String']['input'];
};

export type CreateTransactionInput = {
  amount?: InputMaybe<Scalars['Float']['input']>;
  category: AssetCategory;
  contactId?: InputMaybe<Scalars['ID']['input']>;
  currency?: Scalars['String']['input'];
  date: Scalars['DateTime']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  itemName?: InputMaybe<Scalars['String']['input']>;
  parentId?: InputMaybe<Scalars['ID']['input']>;
  quantity?: InputMaybe<Scalars['Int']['input']>;
  returnDirection?: InputMaybe<ReturnDirection>;
  type: TransactionType;
  witnessInvites?: InputMaybe<Array<WitnessInviteInput>>;
  witnessUserIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type FilterTransactionInput = {
  contactId?: InputMaybe<Scalars['String']['input']>;
  currency?: InputMaybe<Scalars['String']['input']>;
  endDate?: InputMaybe<Scalars['DateTime']['input']>;
  maxAmount?: InputMaybe<Scalars['Float']['input']>;
  minAmount?: InputMaybe<Scalars['Float']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['DateTime']['input']>;
  status?: InputMaybe<TransactionStatus>;
  summaryCurrency?: InputMaybe<Scalars['String']['input']>;
  types?: InputMaybe<Array<TransactionType>>;
};

export type ForgotPasswordInput = {
  email: Scalars['String']['input'];
};

export type GeoIpInfo = {
  __typename: 'GeoIPInfo';
  cityName: Scalars['String']['output'];
  countryCode: Scalars['String']['output'];
  countryName: Scalars['String']['output'];
  currencyCode: Maybe<Scalars['String']['output']>;
  ip: Scalars['String']['output'];
  isVpn: Scalars['Boolean']['output'];
  regionName: Scalars['String']['output'];
};

export type GrantAccessInput = {
  email: Scalars['String']['input'];
};

export type InviteContactResponse = {
  __typename: 'InviteContactResponse';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type LogProjectTransactionInput = {
  amount: Scalars['Float']['input'];
  category?: InputMaybe<Scalars['String']['input']>;
  date?: InputMaybe<Scalars['DateTime']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  projectId: Scalars['String']['input'];
  type: ProjectTransactionType;
};

export type LoginInput = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type Mutation = {
  __typename: 'Mutation';
  acceptAccess: AccessGrant;
  acceptInvitation: AuthPayload;
  acknowledgeWitness: Witness;
  addWitness: Transaction;
  cancelSubscription: Scalars['Boolean']['output'];
  changePassword: Scalars['Boolean']['output'];
  createCheckoutSession: CheckoutSession;
  createContact: Contact;
  createContribution: Contribution;
  createContributionSession: CheckoutSession;
  createProject: Project;
  createPromise: Promise;
  createTransaction: Transaction;
  forgotPassword: Scalars['Boolean']['output'];
  grantAccess: AccessGrant;
  inviteContactToPlatform: InviteContactResponse;
  logProjectTransaction: ProjectTransaction;
  login: AuthPayload;
  logout: Scalars['Boolean']['output'];
  refreshToken: AuthPayload;
  removeContact: Contact;
  removePromise: Promise;
  removeTransaction: Transaction;
  removeWitness: Witness;
  resendContactInvitation: InviteContactResponse;
  resendVerificationEmail: Scalars['Boolean']['output'];
  resendWitnessInvitation: Witness;
  resetPassword: Scalars['Boolean']['output'];
  revokeAccess: AccessGrant;
  signup: AuthPayload;
  updateContact: Contact;
  updateProject: Project;
  updatePromise: Promise;
  updateTransaction: Transaction;
  updateUser: User;
  verifyEmail: AuthPayload;
};


export type MutationAcceptAccessArgs = {
  token: Scalars['String']['input'];
};


export type MutationAcceptInvitationArgs = {
  acceptInvitationInput: AcceptInvitationInput;
};


export type MutationAcknowledgeWitnessArgs = {
  input: AcknowledgeWitnessInput;
};


export type MutationAddWitnessArgs = {
  input: AddWitnessInput;
};


export type MutationChangePasswordArgs = {
  changePasswordInput: ChangePasswordInput;
};


export type MutationCreateCheckoutSessionArgs = {
  currency?: InputMaybe<Scalars['String']['input']>;
  tier: SubscriptionTier;
};


export type MutationCreateContactArgs = {
  createContactInput: CreateContactInput;
};


export type MutationCreateContributionArgs = {
  createContributionInput: CreateContributionInput;
};


export type MutationCreateContributionSessionArgs = {
  amount?: InputMaybe<Scalars['Float']['input']>;
  currency?: InputMaybe<Scalars['String']['input']>;
};


export type MutationCreateProjectArgs = {
  input: CreateProjectInput;
};


export type MutationCreatePromiseArgs = {
  createPromiseInput: CreatePromiseInput;
};


export type MutationCreateTransactionArgs = {
  input: CreateTransactionInput;
};


export type MutationForgotPasswordArgs = {
  forgotPasswordInput: ForgotPasswordInput;
};


export type MutationGrantAccessArgs = {
  grantAccessInput: GrantAccessInput;
};


export type MutationInviteContactToPlatformArgs = {
  contactId: Scalars['ID']['input'];
};


export type MutationLogProjectTransactionArgs = {
  input: LogProjectTransactionInput;
};


export type MutationLoginArgs = {
  loginInput: LoginInput;
};


export type MutationRefreshTokenArgs = {
  refreshTokenInput: RefreshTokenInput;
};


export type MutationRemoveContactArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemovePromiseArgs = {
  id: Scalars['String']['input'];
};


export type MutationRemoveTransactionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveWitnessArgs = {
  witnessId: Scalars['ID']['input'];
};


export type MutationResendContactInvitationArgs = {
  contactId: Scalars['ID']['input'];
};


export type MutationResendVerificationEmailArgs = {
  email: Scalars['String']['input'];
};


export type MutationResendWitnessInvitationArgs = {
  witnessId: Scalars['ID']['input'];
};


export type MutationResetPasswordArgs = {
  resetPasswordInput: ResetPasswordInput;
};


export type MutationRevokeAccessArgs = {
  id: Scalars['String']['input'];
};


export type MutationSignupArgs = {
  signupInput: SignupInput;
};


export type MutationUpdateContactArgs = {
  updateContactInput: UpdateContactInput;
};


export type MutationUpdateProjectArgs = {
  input: UpdateProjectInput;
};


export type MutationUpdatePromiseArgs = {
  updatePromiseInput: UpdatePromiseInput;
};


export type MutationUpdateTransactionArgs = {
  input: UpdateTransactionInput;
};


export type MutationUpdateUserArgs = {
  updateUserInput: UpdateUserInput;
};


export type MutationVerifyEmailArgs = {
  token: Scalars['String']['input'];
};

export enum Priority {
  High = 'HIGH',
  Low = 'LOW',
  Medium = 'MEDIUM'
}

export type Project = {
  __typename: 'Project';
  balance: Scalars['Float']['output'];
  budget: Maybe<Scalars['Float']['output']>;
  createdAt: Scalars['DateTime']['output'];
  currency: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  transactions: Array<ProjectTransaction>;
  updatedAt: Scalars['DateTime']['output'];
  userId: Scalars['String']['output'];
};

export type ProjectTransaction = {
  __typename: 'ProjectTransaction';
  amount: Scalars['Float']['output'];
  category: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  date: Scalars['DateTime']['output'];
  description: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  projectId: Scalars['String']['output'];
  type: ProjectTransactionType;
  updatedAt: Scalars['DateTime']['output'];
};

export enum ProjectTransactionType {
  Expense = 'EXPENSE',
  Income = 'INCOME'
}

export type Promise = {
  __typename: 'Promise';
  category: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  description: Scalars['String']['output'];
  dueDate: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  notes: Maybe<Scalars['String']['output']>;
  priority: Priority;
  promiseTo: Scalars['String']['output'];
  status: PromiseStatus;
  updatedAt: Scalars['DateTime']['output'];
};

export enum PromiseStatus {
  Fulfilled = 'FULFILLED',
  Overdue = 'OVERDUE',
  Pending = 'PENDING'
}

export type Query = {
  __typename: 'Query';
  checkContactOnPlatform: ContactPlatformStatus;
  contact: Contact;
  contacts: Array<Contact>;
  contribution: Contribution;
  contributionOptions: Array<ContributionOption>;
  contributions: Array<Contribution>;
  convertCurrency: Scalars['Float']['output'];
  getGeoIPInfo: GeoIpInfo;
  getWitnessInvitation: Witness;
  me: User;
  myAccessGrants: Array<AccessGrant>;
  myContactTransactions: Array<Transaction>;
  myContributions: Array<Contribution>;
  myProjects: Array<Project>;
  myPromises: Array<Promise>;
  mySubscription: SubscriptionInfo;
  myWitnessRequests: Array<Witness>;
  project: Project;
  promise: Promise;
  receivedAccessGrants: Array<AccessGrant>;
  searchWitness: Maybe<WitnessCandidate>;
  sharedData: SharedDataEntity;
  totalBalance: TransactionsSummary;
  transaction: Transaction;
  transactions: TransactionsResponse;
  transactionsGroupedByContact: Array<ContactGroupedSummary>;
  user: Maybe<User>;
  witnessInvitation: Witness;
};


export type QueryCheckContactOnPlatformArgs = {
  contactId: Scalars['ID']['input'];
};


export type QueryContactArgs = {
  id: Scalars['ID']['input'];
};


export type QueryContributionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryContributionOptionsArgs = {
  currency?: InputMaybe<Scalars['String']['input']>;
};


export type QueryConvertCurrencyArgs = {
  amount: Scalars['Float']['input'];
  from: Scalars['String']['input'];
  to: Scalars['String']['input'];
};


export type QueryGetWitnessInvitationArgs = {
  token: Scalars['String']['input'];
};


export type QueryMyWitnessRequestsArgs = {
  status?: InputMaybe<WitnessStatus>;
};


export type QueryProjectArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPromiseArgs = {
  id: Scalars['String']['input'];
};


export type QuerySearchWitnessArgs = {
  input: SearchWitnessInput;
};


export type QuerySharedDataArgs = {
  grantId: Scalars['String']['input'];
};


export type QueryTotalBalanceArgs = {
  currency?: InputMaybe<Scalars['String']['input']>;
};


export type QueryTransactionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTransactionsArgs = {
  filter?: InputMaybe<FilterTransactionInput>;
};


export type QueryTransactionsGroupedByContactArgs = {
  filter?: InputMaybe<FilterTransactionInput>;
};


export type QueryUserArgs = {
  id: Scalars['String']['input'];
};


export type QueryWitnessInvitationArgs = {
  token: Scalars['String']['input'];
};

export type RefreshTokenInput = {
  refreshToken?: InputMaybe<Scalars['String']['input']>;
};

export type ResetPasswordInput = {
  newPassword: Scalars['String']['input'];
  token: Scalars['String']['input'];
};

export enum ReturnDirection {
  ToContact = 'TO_CONTACT',
  ToMe = 'TO_ME'
}

export enum SearchType {
  Email = 'EMAIL',
  Phone = 'PHONE'
}

export type SearchWitnessInput = {
  query: Scalars['String']['input'];
  type: SearchType;
};

export type SharedDataEntity = {
  __typename: 'SharedDataEntity';
  promises: Maybe<Array<Promise>>;
  transactions: Maybe<Array<Transaction>>;
  user: Maybe<User>;
};

export type SignupInput = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
  token?: InputMaybe<Scalars['String']['input']>;
};

export type SubscriptionInfo = {
  __typename: 'SubscriptionInfo';
  featureUsage: Maybe<Scalars['JSON']['output']>;
  limits: TierLimitsEntity;
  subscriptionStatus: Maybe<Scalars['String']['output']>;
  tier: Scalars['String']['output'];
};

/** The subscription tier of the user */
export enum SubscriptionTier {
  Free = 'FREE',
  Pro = 'PRO'
}

export type TierLimitsEntity = {
  __typename: 'TierLimitsEntity';
  allowAdvancedAnalytics: Scalars['Boolean']['output'];
  allowProfessionalReports: Scalars['Boolean']['output'];
  allowSMS: Scalars['Boolean']['output'];
  maxContacts: Scalars['Int']['output'];
  maxWitnessesPerMonth: Scalars['Int']['output'];
};

export type Transaction = {
  __typename: 'Transaction';
  amount: Maybe<Scalars['Float']['output']>;
  category: AssetCategory;
  contact: Maybe<Contact>;
  contactId: Maybe<Scalars['String']['output']>;
  conversions: Maybe<Array<Transaction>>;
  createdAt: Maybe<Scalars['DateTime']['output']>;
  createdBy: Maybe<User>;
  createdById: Scalars['String']['output'];
  currency: Scalars['String']['output'];
  date: Scalars['DateTime']['output'];
  description: Maybe<Scalars['String']['output']>;
  history: Maybe<Array<TransactionHistory>>;
  id: Scalars['ID']['output'];
  itemName: Maybe<Scalars['String']['output']>;
  parent: Maybe<Transaction>;
  parentId: Maybe<Scalars['String']['output']>;
  quantity: Maybe<Scalars['Int']['output']>;
  returnDirection: Maybe<ReturnDirection>;
  status: TransactionStatus;
  type: TransactionType;
  witnesses: Maybe<Array<Witness>>;
};

export type TransactionHistory = {
  __typename: 'TransactionHistory';
  changeType: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  newState: Scalars['JSON']['output'];
  previousState: Scalars['JSON']['output'];
  transactionId: Scalars['String']['output'];
  user: Maybe<User>;
  userId: Scalars['String']['output'];
};

export enum TransactionStatus {
  Cancelled = 'CANCELLED',
  Completed = 'COMPLETED',
  Pending = 'PENDING'
}

export enum TransactionType {
  Expense = 'EXPENSE',
  Gift = 'GIFT',
  Given = 'GIVEN',
  Income = 'INCOME',
  Received = 'RECEIVED',
  Returned = 'RETURNED'
}

export type TransactionsResponse = {
  __typename: 'TransactionsResponse';
  items: Array<Transaction>;
  summary: TransactionsSummary;
};

export type TransactionsSummary = {
  __typename: 'TransactionsSummary';
  currency: Scalars['String']['output'];
  netBalance: Scalars['Float']['output'];
  totalExpense: Scalars['Float']['output'];
  totalGiftGiven: Scalars['Float']['output'];
  totalGiftReceived: Scalars['Float']['output'];
  totalGiven: Scalars['Float']['output'];
  totalIncome: Scalars['Float']['output'];
  totalReceived: Scalars['Float']['output'];
  totalReturned: Scalars['Float']['output'];
  totalReturnedToMe: Scalars['Float']['output'];
  totalReturnedToOther: Scalars['Float']['output'];
};

export type UpdateContactInput = {
  email?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProjectInput = {
  budget?: InputMaybe<Scalars['Float']['input']>;
  currency?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePromiseInput = {
  category?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  dueDate?: InputMaybe<Scalars['DateTime']['input']>;
  id: Scalars['String']['input'];
  notes?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<Priority>;
  promiseTo?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<PromiseStatus>;
};

export type UpdateTransactionInput = {
  amount?: InputMaybe<Scalars['Float']['input']>;
  category?: InputMaybe<AssetCategory>;
  contactId?: InputMaybe<Scalars['ID']['input']>;
  currency?: InputMaybe<Scalars['String']['input']>;
  date?: InputMaybe<Scalars['DateTime']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  itemName?: InputMaybe<Scalars['String']['input']>;
  parentId?: InputMaybe<Scalars['ID']['input']>;
  quantity?: InputMaybe<Scalars['Int']['input']>;
  returnDirection?: InputMaybe<ReturnDirection>;
  type?: InputMaybe<TransactionType>;
  witnessInvites?: InputMaybe<Array<WitnessInviteInput>>;
  witnessUserIds?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type UpdateUserInput = {
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
  preferredCurrency?: InputMaybe<Scalars['String']['input']>;
};

export type User = {
  __typename: 'User';
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  featureUsage: Maybe<Scalars['JSON']['output']>;
  firstName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isContributor: Scalars['Boolean']['output'];
  isEmailVerified: Scalars['Boolean']['output'];
  lastName: Scalars['String']['output'];
  name: Scalars['String']['output'];
  passwordHash: Maybe<Scalars['String']['output']>;
  phoneNumber: Maybe<Scalars['String']['output']>;
  preferredCurrency: Scalars['String']['output'];
  subscriptionStatus: Maybe<Scalars['String']['output']>;
  tier: SubscriptionTier;
};

export type Witness = {
  __typename: 'Witness';
  acknowledgedAt: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  invitedAt: Scalars['DateTime']['output'];
  status: WitnessStatus;
  transaction: Maybe<Transaction>;
  transactionId: Scalars['String']['output'];
  user: Maybe<User>;
  userId: Scalars['String']['output'];
};

export type WitnessCandidate = {
  __typename: 'WitnessCandidate';
  firstName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  lastName: Scalars['String']['output'];
};

export type WitnessInviteInput = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
};

export enum WitnessStatus {
  Acknowledged = 'ACKNOWLEDGED',
  Declined = 'DECLINED',
  Modified = 'MODIFIED',
  Pending = 'PENDING'
}

export type RefreshTokenMutationVariables = Exact<{
  refreshTokenInput: RefreshTokenInput;
}>;


export type RefreshTokenMutation = { refreshToken: { __typename: 'AuthPayload', accessToken: string | null, refreshToken: string | null, user: { __typename: 'User', id: string, email: string, name: string } } };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: { __typename: 'User', id: string, email: string, name: string, firstName: string, lastName: string, phoneNumber: string | null, preferredCurrency: string, isContributor: boolean } };

export type LoginMutationVariables = Exact<{
  loginInput: LoginInput;
}>;


export type LoginMutation = { login: { __typename: 'AuthPayload', accessToken: string | null, refreshToken: string | null, user: { __typename: 'User', id: string, email: string, name: string, isContributor: boolean } } };

export type LogoutMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutMutation = { logout: boolean };

export type SignupMutationVariables = Exact<{
  signupInput: SignupInput;
}>;


export type SignupMutation = { signup: { __typename: 'AuthPayload', accessToken: string | null, refreshToken: string | null, user: { __typename: 'User', id: string, email: string, name: string, isContributor: boolean } } };

export type AcceptInvitationMutationVariables = Exact<{
  acceptInvitationInput: AcceptInvitationInput;
}>;


export type AcceptInvitationMutation = { acceptInvitation: { __typename: 'AuthPayload', accessToken: string | null, refreshToken: string | null, user: { __typename: 'User', id: string, email: string, name: string, isContributor: boolean } } };

export type ForgotPasswordMutationVariables = Exact<{
  forgotPasswordInput: ForgotPasswordInput;
}>;


export type ForgotPasswordMutation = { forgotPassword: boolean };

export type ResetPasswordMutationVariables = Exact<{
  resetPasswordInput: ResetPasswordInput;
}>;


export type ResetPasswordMutation = { resetPassword: boolean };

export type ChangePasswordMutationVariables = Exact<{
  changePasswordInput: ChangePasswordInput;
}>;


export type ChangePasswordMutation = { changePassword: boolean };

export type VerifyEmailMutationVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type VerifyEmailMutation = { verifyEmail: { __typename: 'AuthPayload', accessToken: string | null, refreshToken: string | null, user: { __typename: 'User', id: string, email: string, name: string, isContributor: boolean } } };

export type ResendVerificationEmailMutationVariables = Exact<{
  email: Scalars['String']['input'];
}>;


export type ResendVerificationEmailMutation = { resendVerificationEmail: boolean };

export type GetContactsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetContactsQuery = { contacts: Array<{ __typename: 'Contact', id: string, name: string, email: string | null, phoneNumber: string | null, balance: number, isOnPlatform: boolean, hasPendingInvitation: boolean, createdAt: string }> };

export type GetContactQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetContactQuery = { contact: { __typename: 'Contact', id: string, name: string, email: string | null, phoneNumber: string | null, balance: number, isOnPlatform: boolean, hasPendingInvitation: boolean, createdAt: string } };

export type InviteContactMutationVariables = Exact<{
  contactId: Scalars['ID']['input'];
}>;


export type InviteContactMutation = { inviteContactToPlatform: { __typename: 'InviteContactResponse', success: boolean, message: string } };

export type ResendContactInvitationMutationVariables = Exact<{
  contactId: Scalars['ID']['input'];
}>;


export type ResendContactInvitationMutation = { resendContactInvitation: { __typename: 'InviteContactResponse', success: boolean, message: string } };

export type CreateContactMutationVariables = Exact<{
  createContactInput: CreateContactInput;
}>;


export type CreateContactMutation = { createContact: { __typename: 'Contact', id: string, name: string, email: string | null, phoneNumber: string | null, balance: number } };

export type UpdateContactMutationVariables = Exact<{
  updateContactInput: UpdateContactInput;
}>;


export type UpdateContactMutation = { updateContact: { __typename: 'Contact', id: string, name: string, email: string | null, phoneNumber: string | null } };

export type DeleteContactMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteContactMutation = { removeContact: { __typename: 'Contact', id: string } };

export type GetGeoIpInfoQueryVariables = Exact<{ [key: string]: never; }>;


export type GetGeoIpInfoQuery = { getGeoIPInfo: { __typename: 'GeoIPInfo', ip: string, countryCode: string, countryName: string, regionName: string, cityName: string, currencyCode: string | null, isVpn: boolean } };

export type CreateCheckoutSessionMutationVariables = Exact<{
  tier: SubscriptionTier;
  currency: Scalars['String']['input'];
}>;


export type CreateCheckoutSessionMutation = { createCheckoutSession: { __typename: 'CheckoutSession', url: string } };

export type CreateContributionSessionMutationVariables = Exact<{
  amount?: InputMaybe<Scalars['Float']['input']>;
  currency?: InputMaybe<Scalars['String']['input']>;
}>;


export type CreateContributionSessionMutation = { createContributionSession: { __typename: 'CheckoutSession', url: string } };

export type ProjectFieldsFragment = { __typename: 'Project', id: string, name: string, description: string | null, budget: number | null, balance: number, currency: string, userId: string, createdAt: string, updatedAt: string };

export type ProjectTransactionFieldsFragment = { __typename: 'ProjectTransaction', id: string, amount: number, type: ProjectTransactionType, category: string | null, description: string | null, date: string, projectId: string, createdAt: string, updatedAt: string };

export type GetMyProjectsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMyProjectsQuery = { myProjects: Array<{ __typename: 'Project', id: string, name: string, description: string | null, budget: number | null, balance: number, currency: string, userId: string, createdAt: string, updatedAt: string }> };

export type GetProjectQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetProjectQuery = { project: { __typename: 'Project', id: string, name: string, description: string | null, budget: number | null, balance: number, currency: string, userId: string, createdAt: string, updatedAt: string, transactions: Array<{ __typename: 'ProjectTransaction', id: string, amount: number, type: ProjectTransactionType, category: string | null, description: string | null, date: string, projectId: string, createdAt: string, updatedAt: string }> } };

export type CreateProjectMutationVariables = Exact<{
  input: CreateProjectInput;
}>;


export type CreateProjectMutation = { createProject: { __typename: 'Project', id: string, name: string, description: string | null, budget: number | null, balance: number, currency: string, userId: string, createdAt: string, updatedAt: string } };

export type UpdateProjectMutationVariables = Exact<{
  input: UpdateProjectInput;
}>;


export type UpdateProjectMutation = { updateProject: { __typename: 'Project', id: string, name: string, description: string | null, budget: number | null, balance: number, currency: string, userId: string, createdAt: string, updatedAt: string } };

export type LogProjectTransactionMutationVariables = Exact<{
  input: LogProjectTransactionInput;
}>;


export type LogProjectTransactionMutation = { logProjectTransaction: { __typename: 'ProjectTransaction', id: string, amount: number, type: ProjectTransactionType, category: string | null, description: string | null, date: string, projectId: string, createdAt: string, updatedAt: string } };

export type MyPromisesQueryVariables = Exact<{ [key: string]: never; }>;


export type MyPromisesQuery = { myPromises: Array<{ __typename: 'Promise', id: string, description: string, promiseTo: string, dueDate: string, priority: Priority, status: PromiseStatus, category: string | null, notes: string | null, createdAt: string, updatedAt: string }> };

export type CreatePromiseMutationVariables = Exact<{
  input: CreatePromiseInput;
}>;


export type CreatePromiseMutation = { createPromise: { __typename: 'Promise', id: string, description: string, promiseTo: string, dueDate: string, priority: Priority, status: PromiseStatus } };

export type UpdatePromiseMutationVariables = Exact<{
  input: UpdatePromiseInput;
}>;


export type UpdatePromiseMutation = { updatePromise: { __typename: 'Promise', id: string, description: string, priority: Priority, status: PromiseStatus } };

export type RemovePromiseMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type RemovePromiseMutation = { removePromise: { __typename: 'Promise', id: string } };

export type MyAccessGrantsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyAccessGrantsQuery = { myAccessGrants: Array<{ __typename: 'AccessGrant', id: string, email: string, token: string, status: AccessStatus, createdAt: string, expiresAt: string | null }> };

export type GrantAccessMutationVariables = Exact<{
  input: GrantAccessInput;
}>;


export type GrantAccessMutation = { grantAccess: { __typename: 'AccessGrant', id: string, email: string, status: AccessStatus } };

export type RevokeAccessMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type RevokeAccessMutation = { revokeAccess: { __typename: 'AccessGrant', id: string, status: AccessStatus } };

export type ReceivedAccessGrantsQueryVariables = Exact<{ [key: string]: never; }>;


export type ReceivedAccessGrantsQuery = { receivedAccessGrants: Array<{ __typename: 'AccessGrant', id: string, email: string, token: string, status: AccessStatus, createdAt: string, granter: { __typename: 'User', id: string, firstName: string, lastName: string, email: string } | null }> };

export type AcceptAccessMutationVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type AcceptAccessMutation = { acceptAccess: { __typename: 'AccessGrant', id: string, status: AccessStatus } };

export type SharedDataQueryVariables = Exact<{
  grantId: Scalars['String']['input'];
}>;


export type SharedDataQuery = { sharedData: { __typename: 'SharedDataEntity', user: { __typename: 'User', id: string, firstName: string, lastName: string, email: string } | null, transactions: Array<{ __typename: 'Transaction', id: string, amount: number | null, currency: string, type: TransactionType, date: string, description: string | null, category: AssetCategory, itemName: string | null, quantity: number | null, returnDirection: ReturnDirection | null, contact: { __typename: 'Contact', name: string } | null, witnesses: Array<{ __typename: 'Witness', id: string, status: WitnessStatus, user: { __typename: 'User', name: string } | null }> | null }> | null, promises: Array<{ __typename: 'Promise', id: string, description: string, promiseTo: string, dueDate: string, priority: Priority, status: PromiseStatus, notes: string | null }> | null } };

export type MySubscriptionQueryVariables = Exact<{ [key: string]: never; }>;


export type MySubscriptionQuery = { mySubscription: { __typename: 'SubscriptionInfo', tier: string, featureUsage: Record<string, unknown> | null, subscriptionStatus: string | null, limits: { __typename: 'TierLimitsEntity', maxContacts: number, maxWitnessesPerMonth: number, allowSMS: boolean, allowAdvancedAnalytics: boolean, allowProfessionalReports: boolean } } };

export type TotalBalanceQueryVariables = Exact<{
  currency?: InputMaybe<Scalars['String']['input']>;
}>;


export type TotalBalanceQuery = { totalBalance: { __typename: 'TransactionsSummary', totalGiven: number, totalReceived: number, totalReturned: number, totalReturnedToMe: number, totalReturnedToOther: number, totalIncome: number, totalExpense: number, totalGiftGiven: number, totalGiftReceived: number, netBalance: number, currency: string } };

export type TransactionQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type TransactionQuery = { transaction: { __typename: 'Transaction', id: string, amount: number | null, category: AssetCategory, type: TransactionType, currency: string, date: string, description: string | null, itemName: string | null, quantity: number | null, returnDirection: ReturnDirection | null, createdAt: string | null, parentId: string | null, conversions: Array<{ __typename: 'Transaction', id: string, amount: number | null, type: TransactionType, currency: string, date: string }> | null, contact: { __typename: 'Contact', id: string, name: string } | null, witnesses: Array<{ __typename: 'Witness', id: string, status: WitnessStatus, invitedAt: string, acknowledgedAt: string | null, user: { __typename: 'User', id: string, name: string, email: string } | null }> | null, history: Array<{ __typename: 'TransactionHistory', id: string, changeType: string, previousState: Record<string, unknown>, newState: Record<string, unknown>, createdAt: string, user: { __typename: 'User', id: string, name: string, email: string } | null }> | null } };

export type RemoveTransactionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RemoveTransactionMutation = { removeTransaction: { __typename: 'Transaction', id: string } };

export type TransactionsQueryVariables = Exact<{
  filter?: InputMaybe<FilterTransactionInput>;
}>;


export type TransactionsQuery = { transactions: { __typename: 'TransactionsResponse', items: Array<{ __typename: 'Transaction', id: string, amount: number | null, category: AssetCategory, type: TransactionType, currency: string, date: string, description: string | null, itemName: string | null, quantity: number | null, returnDirection: ReturnDirection | null, createdAt: string | null, createdBy: { __typename: 'User', id: string, name: string } | null, contact: { __typename: 'Contact', id: string, name: string } | null, witnesses: Array<{ __typename: 'Witness', id: string, status: WitnessStatus }> | null }>, summary: { __typename: 'TransactionsSummary', totalGiven: number, totalReceived: number, totalReturned: number, totalReturnedToMe: number, totalReturnedToOther: number, totalIncome: number, totalExpense: number, totalGiftGiven: number, totalGiftReceived: number, netBalance: number, currency: string } } };

export type MyContactTransactionsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyContactTransactionsQuery = { myContactTransactions: Array<{ __typename: 'Transaction', id: string, amount: number | null, category: AssetCategory, type: TransactionType, currency: string, date: string, description: string | null, itemName: string | null, quantity: number | null, returnDirection: ReturnDirection | null, createdAt: string | null, createdBy: { __typename: 'User', id: string, name: string, email: string } | null, contact: { __typename: 'Contact', id: string, name: string } | null, witnesses: Array<{ __typename: 'Witness', id: string, status: WitnessStatus, invitedAt: string, acknowledgedAt: string | null, user: { __typename: 'User', id: string, name: string, email: string } | null }> | null }> };

export type TransactionsGroupedByContactQueryVariables = Exact<{
  filter?: InputMaybe<FilterTransactionInput>;
}>;


export type TransactionsGroupedByContactQuery = { transactionsGroupedByContact: Array<{ __typename: 'ContactGroupedSummary', contact: { __typename: 'Contact', id: string, name: string } | null, summary: { __typename: 'TransactionsSummary', totalGiven: number, totalReceived: number, totalReturned: number, totalReturnedToMe: number, totalReturnedToOther: number, totalIncome: number, totalExpense: number, totalGiftGiven: number, totalGiftReceived: number, netBalance: number, currency: string } }> };

export type CreateTransactionMutationVariables = Exact<{
  input: CreateTransactionInput;
}>;


export type CreateTransactionMutation = { createTransaction: { __typename: 'Transaction', id: string, amount: number | null, type: TransactionType, currency: string, description: string | null, date: string, parentId: string | null } };

export type AddWitnessMutationVariables = Exact<{
  input: AddWitnessInput;
}>;


export type AddWitnessMutation = { addWitness: { __typename: 'Transaction', id: string, witnesses: Array<{ __typename: 'Witness', id: string, status: WitnessStatus, invitedAt: string, user: { __typename: 'User', id: string, name: string, email: string } | null }> | null } };

export type UpdateTransactionMutationVariables = Exact<{
  input: UpdateTransactionInput;
}>;


export type UpdateTransactionMutation = { updateTransaction: { __typename: 'Transaction', id: string, amount: number | null, category: AssetCategory, type: TransactionType, currency: string, date: string, description: string | null, itemName: string | null, quantity: number | null, returnDirection: ReturnDirection | null, contact: { __typename: 'Contact', id: string, name: string } | null } };

export type UpdateUserMutationVariables = Exact<{
  input: UpdateUserInput;
}>;


export type UpdateUserMutation = { updateUser: { __typename: 'User', id: string, firstName: string, lastName: string, phoneNumber: string | null, email: string, preferredCurrency: string } };

export type SearchWitnessQueryVariables = Exact<{
  input: SearchWitnessInput;
}>;


export type SearchWitnessQuery = { searchWitness: { __typename: 'WitnessCandidate', id: string, firstName: string, lastName: string } | null };

export type MyWitnessRequestsQueryVariables = Exact<{
  status?: InputMaybe<WitnessStatus>;
}>;


export type MyWitnessRequestsQuery = { myWitnessRequests: Array<{ __typename: 'Witness', id: string, status: WitnessStatus, invitedAt: string, acknowledgedAt: string | null, transaction: { __typename: 'Transaction', id: string, amount: number | null, currency: string, type: TransactionType, category: AssetCategory, itemName: string | null, description: string | null, date: string, returnDirection: ReturnDirection | null, createdBy: { __typename: 'User', name: string, email: string } | null, contact: { __typename: 'Contact', id: string, firstName: string, lastName: string, name: string } | null } | null }> };

export type ResendWitnessInvitationMutationVariables = Exact<{
  witnessId: Scalars['ID']['input'];
}>;


export type ResendWitnessInvitationMutation = { resendWitnessInvitation: { __typename: 'Witness', id: string, status: WitnessStatus, invitedAt: string } };

export type RemoveWitnessMutationVariables = Exact<{
  witnessId: Scalars['ID']['input'];
}>;


export type RemoveWitnessMutation = { removeWitness: { __typename: 'Witness', id: string } };

export type AcknowledgeWitnessRequestMutationVariables = Exact<{
  input: AcknowledgeWitnessInput;
}>;


export type AcknowledgeWitnessRequestMutation = { acknowledgeWitness: { __typename: 'Witness', id: string, status: WitnessStatus, acknowledgedAt: string | null } };

export type GetWitnessInvitationQueryVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type GetWitnessInvitationQuery = { witnessInvitation: { __typename: 'Witness', id: string, status: WitnessStatus, transaction: { __typename: 'Transaction', id: string, amount: number | null, currency: string, type: TransactionType, category: AssetCategory, itemName: string | null, description: string | null, date: string, returnDirection: ReturnDirection | null, createdBy: { __typename: 'User', name: string } | null, contact: { __typename: 'Contact', id: string, firstName: string, lastName: string, name: string } | null } | null, user: { __typename: 'User', id: string, email: string, name: string, passwordHash: string | null } | null } };
