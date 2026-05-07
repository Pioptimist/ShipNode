export const API_PATHS = {
  AUTH: {
    GITHUB_LOGIN: "/api/auth/github",
    REFRESH: "/api/auth/refresh",
    LOGOUT: "/api/auth/logout",
    GET_ME: "/api/auth/me",
  },
  USERS: {
    CHECK_USERNAME: (username) => `/api/users/check-username?username=${username}`,
    UPDATE_PROFILE: "/api/users/profile",
  },
  GITHUB: {
    GET_REPOS: "/api/github/repos",
    GET_CONTENTS: "/api/github/contents",
    GET_BRANCHES: "/api/github/branches",
  },
  PROJECTS: {
    CREATE: "/api/projects",
    GET_ALL: "/api/projects",               
    GET_ONE: (id) => `/api/projects/${id}`,
     
    ROLLBACK: (id) => `/api/projects/${id}/rollback`, 
    DELETE: (id) => `/api/projects/${id}`,  
    GET_ENVS: (id) => `/api/projects/${id}/envs`,
    ADD_ENV: (id) => `/api/projects/${id}/envs`,
    DELETE_ENV: (projectId, envId) => `/api/projects/${projectId}/envs/${envId}`, 

    ADD_DOMAIN: (id) => `/api/projects/${id}/domain`,
    VERIFY_DOMAIN: (id) => `/api/projects/${id}/domain/verify`,
    REMOVE_DOMAIN: (id) => `/api/projects/${id}/domain`,
  },
  WEBHOOKS: {
    GITHUB: "/api/webhooks/github",
  },
  DEPLOYMENTS: {
    GET_ALL: "/api/deployments",  
    GET_STATUS: (id) => `/api/deployments/${id}`,
    GET_DEPLOYMENTS: (id) => `/api/deployments/${id}/deployments`,
    GET_LOGS: (id) => `/api/deployments/${id}/logs`,
  },
};