export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
	[K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
	[SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
	[SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
	T extends { [key: string]: unknown },
	K extends keyof T,
> = { [_ in K]?: never };
export type Incremental<T> =
	| T
	| {
			[P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never;
	  };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
	ID: { input: string; output: string };
	String: { input: string; output: string };
	Boolean: { input: boolean; output: boolean };
	Int: { input: number; output: number };
	Float: { input: number; output: number };
	/** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
	DateTime: { input: unknown; output: unknown };
	/** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
	JSON: { input: unknown; output: unknown };
};

export type AcceptInvitationInput = {
	password: Scalars["String"]["input"];
	token: Scalars["String"]["input"];
};

export type AcknowledgeWitnessInput = {
	status: WitnessStatus;
	witnessId: Scalars["ID"]["input"];
};

export type AddWitnessInput = {
	transactionId: Scalars["ID"]["input"];
	witnessInvites?: InputMaybe<Array<WitnessInviteInput>>;
	witnessUserIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
};

export enum AssetCategory {
	Funds = "FUNDS",
	Item = "ITEM",
}

export type AuthPayload = {
	__typename: "AuthPayload";
	accessToken: Scalars["String"]["output"];
	refreshToken: Scalars["String"]["output"];
	user: User;
};

export type ChangePasswordInput = {
	currentPassword: Scalars["String"]["input"];
	newPassword: Scalars["String"]["input"];
};

export type Contact = {
	__typename: "Contact";
	balance: Scalars["Float"]["output"];
	createdAt: Scalars["DateTime"]["output"];
	email: Maybe<Scalars["String"]["output"]>;
	firstName: Scalars["String"]["output"];
	id: Scalars["ID"]["output"];
	lastName: Scalars["String"]["output"];
	name: Scalars["String"]["output"];
	phoneNumber: Maybe<Scalars["String"]["output"]>;
	transactions: Array<Maybe<Transaction>>;
	user: User;
	userId: Scalars["String"]["output"];
};

export type CreateContactInput = {
	email?: InputMaybe<Scalars["String"]["input"]>;
	name: Scalars["String"]["input"];
	phoneNumber?: InputMaybe<Scalars["String"]["input"]>;
};

export type CreateTransactionInput = {
	amount?: InputMaybe<Scalars["Float"]["input"]>;
	category: AssetCategory;
	contactId: Scalars["ID"]["input"];
	date: Scalars["DateTime"]["input"];
	description?: InputMaybe<Scalars["String"]["input"]>;
	itemName?: InputMaybe<Scalars["String"]["input"]>;
	quantity?: InputMaybe<Scalars["Int"]["input"]>;
	type: TransactionType;
	witnessInvites?: InputMaybe<Array<WitnessInviteInput>>;
	witnessUserIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
};

export type ForgotPasswordInput = {
	email: Scalars["String"]["input"];
};

export type LoginInput = {
	email: Scalars["String"]["input"];
	password: Scalars["String"]["input"];
};

export type Mutation = {
	__typename: "Mutation";
	acceptInvitation: AuthPayload;
	acknowledgeWitness: Witness;
	addWitness: Transaction;
	changePassword: Scalars["Boolean"]["output"];
	createContact: Contact;
	createTransaction: Transaction;
	forgotPassword: Scalars["Boolean"]["output"];
	login: AuthPayload;
	logout: Scalars["Boolean"]["output"];
	refreshToken: AuthPayload;
	removeContact: Contact;
	resetPassword: Scalars["Boolean"]["output"];
	signup: AuthPayload;
	updateContact: Contact;
	updateTransaction: Transaction;
	verifyEmail: AuthPayload;
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

export type MutationCreateTransactionArgs = {
	input: CreateTransactionInput;
};

export type MutationForgotPasswordArgs = {
	forgotPasswordInput: ForgotPasswordInput;
};

export type MutationLoginArgs = {
	loginInput: LoginInput;
};

export type MutationRefreshTokenArgs = {
	refreshTokenInput: RefreshTokenInput;
};

export type MutationRemoveContactArgs = {
	id: Scalars["ID"]["input"];
};

export type MutationResetPasswordArgs = {
	resetPasswordInput: ResetPasswordInput;
};

export type MutationSignupArgs = {
	signupInput: SignupInput;
};

export type MutationUpdateContactArgs = {
	updateContactInput: UpdateContactInput;
};

export type MutationUpdateTransactionArgs = {
	input: UpdateTransactionInput;
};

export type MutationVerifyEmailArgs = {
	token: Scalars["String"]["input"];
};

export type Query = {
	__typename: "Query";
	contact: Contact;
	contacts: Array<Contact>;
	me: User;
	myWitnessRequests: Array<Witness>;
	searchWitness: Maybe<WitnessCandidate>;
	transaction: Transaction;
	transactions: Array<Transaction>;
	user: Maybe<User>;
	witnessInvitation: Witness;
};

export type QueryContactArgs = {
	id: Scalars["ID"]["input"];
};

export type QueryMyWitnessRequestsArgs = {
	status?: InputMaybe<WitnessStatus>;
};

export type QuerySearchWitnessArgs = {
	input: SearchWitnessInput;
};

export type QueryTransactionArgs = {
	id: Scalars["ID"]["input"];
};

export type QueryUserArgs = {
	id: Scalars["String"]["input"];
};

export type QueryWitnessInvitationArgs = {
	token: Scalars["String"]["input"];
};

export type RefreshTokenInput = {
	refreshToken: Scalars["String"]["input"];
};

export type ResetPasswordInput = {
	newPassword: Scalars["String"]["input"];
	token: Scalars["String"]["input"];
};

export enum SearchType {
	Email = "EMAIL",
	Phone = "PHONE",
}

export type SearchWitnessInput = {
	query: Scalars["String"]["input"];
	type: SearchType;
};

export type SignupInput = {
	email: Scalars["String"]["input"];
	name: Scalars["String"]["input"];
	password: Scalars["String"]["input"];
};

export type Transaction = {
	__typename: "Transaction";
	amount: Maybe<Scalars["Float"]["output"]>;
	category: AssetCategory;
	contact: Contact;
	contactId: Scalars["String"]["output"];
	createdAt: Scalars["DateTime"]["output"];
	createdBy: User;
	createdById: Scalars["String"]["output"];
	date: Scalars["DateTime"]["output"];
	description: Maybe<Scalars["String"]["output"]>;
	history: Array<Maybe<TransactionHistory>>;
	id: Scalars["ID"]["output"];
	itemName: Maybe<Scalars["String"]["output"]>;
	quantity: Maybe<Scalars["Int"]["output"]>;
	type: TransactionType;
	witnesses: Array<Maybe<Witness>>;
};

export type TransactionHistory = {
	__typename: "TransactionHistory";
	changeType: Scalars["String"]["output"];
	createdAt: Scalars["DateTime"]["output"];
	id: Scalars["ID"]["output"];
	newState: Scalars["JSON"]["output"];
	previousState: Scalars["JSON"]["output"];
	transactionId: Scalars["String"]["output"];
	user: User;
	userId: Scalars["String"]["output"];
};

export enum TransactionType {
	Collected = "COLLECTED",
	Given = "GIVEN",
	Received = "RECEIVED",
}

export type UpdateContactInput = {
	email?: InputMaybe<Scalars["String"]["input"]>;
	id: Scalars["ID"]["input"];
	name?: InputMaybe<Scalars["String"]["input"]>;
	phoneNumber?: InputMaybe<Scalars["String"]["input"]>;
};

export type UpdateTransactionInput = {
	amount?: InputMaybe<Scalars["Float"]["input"]>;
	category?: InputMaybe<AssetCategory>;
	contactId?: InputMaybe<Scalars["ID"]["input"]>;
	date?: InputMaybe<Scalars["DateTime"]["input"]>;
	description?: InputMaybe<Scalars["String"]["input"]>;
	id: Scalars["ID"]["input"];
	itemName?: InputMaybe<Scalars["String"]["input"]>;
	quantity?: InputMaybe<Scalars["Int"]["input"]>;
	type?: InputMaybe<TransactionType>;
	witnessInvites?: InputMaybe<Array<WitnessInviteInput>>;
	witnessUserIds?: InputMaybe<Array<Scalars["ID"]["input"]>>;
};

export type User = {
	__typename: "User";
	createdAt: Scalars["DateTime"]["output"];
	email: Scalars["String"]["output"];
	firstName: Scalars["String"]["output"];
	id: Scalars["ID"]["output"];
	isEmailVerified: Scalars["Boolean"]["output"];
	lastName: Scalars["String"]["output"];
	name: Scalars["String"]["output"];
	passwordHash: Maybe<Scalars["String"]["output"]>;
	phoneNumber: Maybe<Scalars["String"]["output"]>;
};

export type Witness = {
	__typename: "Witness";
	acknowledgedAt: Maybe<Scalars["DateTime"]["output"]>;
	id: Scalars["ID"]["output"];
	invitedAt: Scalars["DateTime"]["output"];
	status: WitnessStatus;
	transaction: Transaction;
	transactionId: Scalars["String"]["output"];
	user: User;
	userId: Scalars["String"]["output"];
};

export type WitnessCandidate = {
	__typename: "WitnessCandidate";
	firstName: Scalars["String"]["output"];
	id: Scalars["ID"]["output"];
	lastName: Scalars["String"]["output"];
};

export type WitnessInviteInput = {
	email: Scalars["String"]["input"];
	name: Scalars["String"]["input"];
	phoneNumber?: InputMaybe<Scalars["String"]["input"]>;
};

export enum WitnessStatus {
	Acknowledged = "ACKNOWLEDGED",
	Declined = "DECLINED",
	Modified = "MODIFIED",
	Pending = "PENDING",
}

export type RefreshTokenMutationVariables = Exact<{
	refreshTokenInput: RefreshTokenInput;
}>;

export type RefreshTokenMutation = {
	refreshToken: {
		__typename: "AuthPayload";
		accessToken: string;
		refreshToken: string;
		user: { __typename: "User"; id: string; email: string; name: string };
	};
};

export type MeQueryVariables = Exact<{ [key: string]: never }>;

export type MeQuery = {
	me: { __typename: "User"; id: string; email: string; name: string };
};

export type LoginMutationVariables = Exact<{
	loginInput: LoginInput;
}>;

export type LoginMutation = {
	login: {
		__typename: "AuthPayload";
		accessToken: string;
		refreshToken: string;
		user: { __typename: "User"; id: string; email: string; name: string };
	};
};

export type SignupMutationVariables = Exact<{
	signupInput: SignupInput;
}>;

export type SignupMutation = {
	signup: {
		__typename: "AuthPayload";
		accessToken: string;
		refreshToken: string;
		user: { __typename: "User"; id: string; email: string; name: string };
	};
};

export type AcceptInvitationMutationVariables = Exact<{
	acceptInvitationInput: AcceptInvitationInput;
}>;

export type AcceptInvitationMutation = {
	acceptInvitation: {
		__typename: "AuthPayload";
		accessToken: string;
		refreshToken: string;
		user: { __typename: "User"; id: string; email: string; name: string };
	};
};

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
	token: Scalars["String"]["input"];
}>;

export type VerifyEmailMutation = {
	verifyEmail: {
		__typename: "AuthPayload";
		accessToken: string;
		refreshToken: string;
		user: { __typename: "User"; id: string; email: string; name: string };
	};
};

export type GetContactsQueryVariables = Exact<{ [key: string]: never }>;

export type GetContactsQuery = {
	contacts: Array<{
		__typename: "Contact";
		id: string;
		name: string;
		email: string | null;
		phoneNumber: string | null;
		balance: number;
		createdAt: unknown;
	}>;
};

export type CreateContactMutationVariables = Exact<{
	createContactInput: CreateContactInput;
}>;

export type CreateContactMutation = {
	createContact: {
		__typename: "Contact";
		id: string;
		name: string;
		email: string | null;
		phoneNumber: string | null;
		balance: number;
	};
};

export type UpdateContactMutationVariables = Exact<{
	updateContactInput: UpdateContactInput;
}>;

export type UpdateContactMutation = {
	updateContact: {
		__typename: "Contact";
		id: string;
		name: string;
		email: string | null;
		phoneNumber: string | null;
	};
};

export type DeleteContactMutationVariables = Exact<{
	id: Scalars["ID"]["input"];
}>;

export type DeleteContactMutation = {
	removeContact: { __typename: "Contact"; id: string };
};

export type TransactionQueryVariables = Exact<{
	id: Scalars["ID"]["input"];
}>;

export type TransactionQuery = {
	transaction: {
		__typename: "Transaction";
		id: string;
		amount: number | null;
		category: AssetCategory;
		type: TransactionType;
		date: unknown;
		description: string | null;
		itemName: string | null;
		quantity: number | null;
		createdAt: unknown;
		contact: { __typename: "Contact"; id: string; name: string };
		witnesses: Array<{
			__typename: "Witness";
			id: string;
			status: WitnessStatus;
			invitedAt: unknown;
			acknowledgedAt: unknown | null;
			user: { __typename: "User"; id: string; name: string; email: string };
		} | null>;
		history: Array<{
			__typename: "TransactionHistory";
			id: string;
			changeType: string;
			previousState: unknown;
			newState: unknown;
			createdAt: unknown;
			user: { __typename: "User"; id: string; name: string; email: string };
		} | null>;
	};
};

export type AddWitnessMutationVariables = Exact<{
	input: AddWitnessInput;
}>;

export type AddWitnessMutation = {
	addWitness: {
		__typename: "Transaction";
		id: string;
		witnesses: Array<{
			__typename: "Witness";
			id: string;
			status: WitnessStatus;
			invitedAt: unknown;
			user: { __typename: "User"; id: string; name: string; email: string };
		} | null>;
	};
};

export type MyWitnessRequestsQueryVariables = Exact<{
	status?: InputMaybe<WitnessStatus>;
}>;

export type MyWitnessRequestsQuery = {
	myWitnessRequests: Array<{
		__typename: "Witness";
		id: string;
		status: WitnessStatus;
		invitedAt: unknown;
		acknowledgedAt: unknown | null;
		transaction: {
			__typename: "Transaction";
			id: string;
			amount: number | null;
			type: TransactionType;
			description: string | null;
			date: unknown;
			createdBy: { __typename: "User"; name: string; email: string };
		};
	}>;
};

export type AcknowledgeWitnessRequestMutationVariables = Exact<{
	input: AcknowledgeWitnessInput;
}>;

export type AcknowledgeWitnessRequestMutation = {
	acknowledgeWitness: {
		__typename: "Witness";
		id: string;
		status: WitnessStatus;
		acknowledgedAt: unknown | null;
	};
};

export type GetWitnessInvitationQueryVariables = Exact<{
	token: Scalars["String"]["input"];
}>;

export type GetWitnessInvitationQuery = {
	witnessInvitation: {
		__typename: "Witness";
		id: string;
		status: WitnessStatus;
		transaction: {
			__typename: "Transaction";
			id: string;
			amount: number | null;
			type: TransactionType;
			description: string | null;
			date: unknown;
			createdBy: { __typename: "User"; name: string };
		};
		user: {
			__typename: "User";
			id: string;
			email: string;
			name: string;
			passwordHash: string | null;
		};
	};
};
