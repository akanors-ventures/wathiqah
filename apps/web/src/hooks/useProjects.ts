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
  UpdateProjectInput,
  LogProjectTransactionInput,
  GetMyProjectsQuery,
  GetProjectQuery,
  CreateProjectMutation,
  UpdateProjectMutation,
  LogProjectTransactionMutation,
} from "@/types/__generated__/graphql";

export function useProjects() {
  const { data, loading, error, refetch } = useQuery<GetMyProjectsQuery>(GET_MY_PROJECTS, {
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
    projects: data?.myProjects || [],
    loading,
    error,
    createProject,
    creating,
    refetch,
  };
}

export function useProject(id: string) {
  const { data, loading, error, refetch } = useQuery<GetProjectQuery>(GET_PROJECT, {
    variables: { id },
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
    loading,
    error,
    updateProject,
    updating,
    logTransaction,
    logging,
    refetch,
  };
}
