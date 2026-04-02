import { useQuery, useMutation } from "@apollo/client/react";
import {
  GET_MY_PROJECTS,
  GET_PROJECT,
  CREATE_PROJECT,
  LOG_PROJECT_TRANSACTION,
  UPDATE_PROJECT,
} from "@/lib/apollo/queries/projects";
import type {
  CreateProjectInput,
  FilterProjectInput,
  FilterProjectTransactionInput,
  UpdateProjectInput,
  LogProjectTransactionInput,
  GetMyProjectsQuery,
  GetProjectQuery,
  CreateProjectMutation,
  UpdateProjectMutation,
  LogProjectTransactionMutation,
} from "@/types/__generated__/graphql";

export function useProjects(filter?: FilterProjectInput) {
  const { data, loading, error, refetch } = useQuery<GetMyProjectsQuery>(GET_MY_PROJECTS, {
    variables: { filter },
    fetchPolicy: "cache-and-network",
  });

  const [createProjectMutation, { loading: creating }] = useMutation<CreateProjectMutation>(
    CREATE_PROJECT,
    {
      onCompleted: () => refetch(),
    },
  );

  const createProject = async (input: CreateProjectInput) => {
    const result = await createProjectMutation({ variables: { input } });
    await refetch();
    return result;
  };

  return {
    projects: data?.myProjects.items || [],
    total: data?.myProjects.total ?? 0,
    page: data?.myProjects.page ?? 1,
    limit: data?.myProjects.limit ?? 25,
    loading,
    error,
    createProject,
    creating,
    refetch,
  };
}

export function useProject(id: string, transactionFilter?: FilterProjectTransactionInput) {
  const { data, loading, error, refetch } = useQuery<GetProjectQuery>(GET_PROJECT, {
    variables: { id, filter: transactionFilter },
    skip: !id,
    fetchPolicy: "cache-and-network",
  });

  const [updateProjectMutation, { loading: updating }] = useMutation<UpdateProjectMutation>(
    UPDATE_PROJECT,
    {
      onCompleted: () => refetch(),
    },
  );

  const [logTransactionMutation, { loading: logging }] = useMutation<LogProjectTransactionMutation>(
    LOG_PROJECT_TRANSACTION,
    {
      onCompleted: () => refetch(),
    },
  );

  const updateProject = async (input: UpdateProjectInput) => {
    return updateProjectMutation({ variables: { input } });
  };

  const logTransaction = async (input: LogProjectTransactionInput) => {
    return logTransactionMutation({ variables: { input } });
  };

  return {
    project: data?.project,
    transactions: data?.project?.transactions?.items || [],
    transactionsTotal: data?.project?.transactions?.total ?? 0,
    transactionsPage: data?.project?.transactions?.page ?? 1,
    transactionsLimit: data?.project?.transactions?.limit ?? 25,
    loading,
    error,
    updateProject,
    updating,
    logTransaction,
    logging,
    refetch,
  };
}
