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
  witnessId: Scalars['ID']['input'];
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

export type ContactPlatformStatus = {
  __typename: 'ContactPlatformStatus';
  isOnPlatform: Scalars['Boolean']['output'];
  linkedUserId: Maybe<Scalars['String']['output']>;
};

export type CreateContactInput = {
  email?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  phoneNumber?: InputMaybe<Scalars['String']['input']>;
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
  search?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<TransactionType>;
};

export type ForgotPasswordInput = {
  email: Scalars['String']['input'];
};

export type GrantAccessInput = {
  email: Scalars['String']['input'];
};

export type InviteContactResponse = {
  __typename: 'InviteContactResponse';
  message: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
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
  changePassword: Scalars['Boolean']['output'];
  createContact: Contact;
  createPromise: Promise;
  createTransaction: Transaction;
  forgotPassword: Scalars['Boolean']['output'];
  grantAccess: AccessGrant;
  inviteContactToPlatform: InviteContactResponse;
  login: AuthPayload;
  logout: Scalars['Boolean']['output'];
  refreshToken: AuthPayload;
  removeContact: Contact;
  removePromise: Promise;
  removeTransaction: Transaction;
  resendVerificationEmail: Scalars['Boolean']['output'];
  resetPassword: Scalars['Boolean']['output'];
  revokeAccess: AccessGrant;
  signup: AuthPayload;
  updateContact: Contact;
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


export type MutationCreateContactArgs = {
  createContactInput: CreateContactInput;
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


export type MutationResendVerificationEmailArgs = {
  email: Scalars['String']['input'];
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
  me: User;
  myAccessGrants: Array<AccessGrant>;
  myContactTransactions: Array<Transaction>;
  myPromises: Array<Promise>;
  myWitnessRequests: Array<Witness>;
  promise: Promise;
  receivedAccessGrants: Array<AccessGrant>;
  searchWitness: Maybe<WitnessCandidate>;
  sharedData: SharedDataEntity;
  transaction: Transaction;
  transactions: TransactionsResponse;
  user: Maybe<User>;
  witnessInvitation: Witness;
};


export type QueryCheckContactOnPlatformArgs = {
  contactId: Scalars['ID']['input'];
};


export type QueryContactArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMyWitnessRequestsArgs = {
  status?: InputMaybe<WitnessStatus>;
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


export type QueryTransactionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTransactionsArgs = {
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
  date: Scalars['DateTime']['output'];
  description: Maybe<Scalars['String']['output']>;
  history: Maybe<Array<TransactionHistory>>;
  id: Scalars['ID']['output'];
  itemName: Maybe<Scalars['String']['output']>;
  parent: Maybe<Transaction>;
  parentId: Maybe<Scalars['String']['output']>;
  quantity: Maybe<Scalars['Int']['output']>;
  returnDirection: Maybe<ReturnDirection>;
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
};

export type User = {
  __typename: 'User';
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  firstName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isEmailVerified: Scalars['Boolean']['output'];
  lastName: Scalars['String']['output'];
  name: Scalars['String']['output'];
  passwordHash: Maybe<Scalars['String']['output']>;
  phoneNumber: Maybe<Scalars['String']['output']>;
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


export type MeQuery = { me: { __typename: 'User', id: string, email: string, name: string, firstName: string, lastName: string, phoneNumber: string | null } };

export type LoginMutationVariables = Exact<{
  loginInput: LoginInput;
}>;


export type LoginMutation = { login: { __typename: 'AuthPayload', accessToken: string | null, refreshToken: string | null, user: { __typename: 'User', id: string, email: string, name: string } } };

export type LogoutMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutMutation = { logout: boolean };

export type SignupMutationVariables = Exact<{
  signupInput: SignupInput;
}>;


export type SignupMutation = { signup: { __typename: 'AuthPayload', accessToken: string | null, refreshToken: string | null, user: { __typename: 'User', id: string, email: string, name: string } } };

export type AcceptInvitationMutationVariables = Exact<{
  acceptInvitationInput: AcceptInvitationInput;
}>;


export type AcceptInvitationMutation = { acceptInvitation: { __typename: 'AuthPayload', accessToken: string | null, refreshToken: string | null, user: { __typename: 'User', id: string, email: string, name: string } } };

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


export type VerifyEmailMutation = { verifyEmail: { __typename: 'AuthPayload', accessToken: string | null, refreshToken: string | null, user: { __typename: 'User', id: string, email: string, name: string } } };

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


export type SharedDataQuery = { sharedData: { __typename: 'SharedDataEntity', user: { __typename: 'User', id: string, firstName: string, lastName: string, email: string } | null, transactions: Array<{ __typename: 'Transaction', id: string, amount: number | null, type: TransactionType, date: string, description: string | null, category: AssetCategory, itemName: string | null, quantity: number | null, contact: { __typename: 'Contact', name: string } | null, witnesses: Array<{ __typename: 'Witness', id: string, status: WitnessStatus, user: { __typename: 'User', name: string } | null }> | null }> | null, promises: Array<{ __typename: 'Promise', id: string, description: string, promiseTo: string, dueDate: string, priority: Priority, status: PromiseStatus, notes: string | null }> | null } };

export type TransactionQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type TransactionQuery = { transaction: { __typename: 'Transaction', id: string, amount: number | null, category: AssetCategory, type: TransactionType, date: string, description: string | null, itemName: string | null, quantity: number | null, returnDirection: ReturnDirection | null, createdAt: string | null, parentId: string | null, conversions: Array<{ __typename: 'Transaction', id: string, amount: number | null, type: TransactionType, date: string }> | null, contact: { __typename: 'Contact', id: string, name: string } | null, witnesses: Array<{ __typename: 'Witness', id: string, status: WitnessStatus, invitedAt: string, acknowledgedAt: string | null, user: { __typename: 'User', id: string, name: string, email: string } | null }> | null, history: Array<{ __typename: 'TransactionHistory', id: string, changeType: string, previousState: Record<string, unknown>, newState: Record<string, unknown>, createdAt: string, user: { __typename: 'User', id: string, name: string, email: string } | null }> | null } };

export type RemoveTransactionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RemoveTransactionMutation = { removeTransaction: { __typename: 'Transaction', id: string } };

export type TransactionsQueryVariables = Exact<{
  filter?: InputMaybe<FilterTransactionInput>;
}>;


export type TransactionsQuery = { transactions: { __typename: 'TransactionsResponse', items: Array<{ __typename: 'Transaction', id: string, amount: number | null, category: AssetCategory, type: TransactionType, date: string, description: string | null, itemName: string | null, quantity: number | null, returnDirection: ReturnDirection | null, createdAt: string | null, contact: { __typename: 'Contact', id: string, name: string } | null, witnesses: Array<{ __typename: 'Witness', id: string, status: WitnessStatus }> | null }>, summary: { __typename: 'TransactionsSummary', totalGiven: number, totalReceived: number, totalReturned: number, totalReturnedToMe: number, totalReturnedToOther: number, totalIncome: number, totalExpense: number, totalGiftGiven: number, totalGiftReceived: number, netBalance: number } } };

export type MyContactTransactionsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyContactTransactionsQuery = { myContactTransactions: Array<{ __typename: 'Transaction', id: string, amount: number | null, category: AssetCategory, type: TransactionType, date: string, description: string | null, itemName: string | null, quantity: number | null, returnDirection: ReturnDirection | null, createdAt: string | null, createdBy: { __typename: 'User', id: string, name: string, email: string } | null, contact: { __typename: 'Contact', id: string, name: string } | null, witnesses: Array<{ __typename: 'Witness', id: string, status: WitnessStatus, invitedAt: string, acknowledgedAt: string | null, user: { __typename: 'User', id: string, name: string, email: string } | null }> | null }> };

export type CreateTransactionMutationVariables = Exact<{
  input: CreateTransactionInput;
}>;


export type CreateTransactionMutation = { createTransaction: { __typename: 'Transaction', id: string, amount: number | null, type: TransactionType, description: string | null, date: string, parentId: string | null } };

export type AddWitnessMutationVariables = Exact<{
  input: AddWitnessInput;
}>;


export type AddWitnessMutation = { addWitness: { __typename: 'Transaction', id: string, witnesses: Array<{ __typename: 'Witness', id: string, status: WitnessStatus, invitedAt: string, user: { __typename: 'User', id: string, name: string, email: string } | null }> | null } };

export type UpdateTransactionMutationVariables = Exact<{
  input: UpdateTransactionInput;
}>;


export type UpdateTransactionMutation = { updateTransaction: { __typename: 'Transaction', id: string, amount: number | null, category: AssetCategory, type: TransactionType, date: string, description: string | null, itemName: string | null, quantity: number | null, returnDirection: ReturnDirection | null, contact: { __typename: 'Contact', id: string, name: string } | null } };

export type UpdateUserMutationVariables = Exact<{
  input: UpdateUserInput;
}>;


export type UpdateUserMutation = { updateUser: { __typename: 'User', id: string, firstName: string, lastName: string, phoneNumber: string | null, email: string } };

export type MyWitnessRequestsQueryVariables = Exact<{
  status?: InputMaybe<WitnessStatus>;
}>;


export type MyWitnessRequestsQuery = { myWitnessRequests: Array<{ __typename: 'Witness', id: string, status: WitnessStatus, invitedAt: string, acknowledgedAt: string | null, transaction: { __typename: 'Transaction', id: string, amount: number | null, type: TransactionType, description: string | null, date: string, createdBy: { __typename: 'User', name: string, email: string } | null } | null }> };

export type AcknowledgeWitnessRequestMutationVariables = Exact<{
  input: AcknowledgeWitnessInput;
}>;


export type AcknowledgeWitnessRequestMutation = { acknowledgeWitness: { __typename: 'Witness', id: string, status: WitnessStatus, acknowledgedAt: string | null } };

export type GetWitnessInvitationQueryVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type GetWitnessInvitationQuery = { witnessInvitation: { __typename: 'Witness', id: string, status: WitnessStatus, transaction: { __typename: 'Transaction', id: string, amount: number | null, type: TransactionType, description: string | null, date: string, createdBy: { __typename: 'User', name: string } | null } | null, user: { __typename: 'User', id: string, email: string, name: string, passwordHash: string | null } | null } };
