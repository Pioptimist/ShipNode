export const API_PATHS = {
  AUTH: {
    GITHUB_LOGIN: "/api/auth/github",
    GITHUB_CALLBACK: "/api/auth/github/callback",
    REFRESH: "/api/auth/refresh",
    LOGOUT: "/api/auth/logout",
    GET_ME: "/api/auth/me",
  },
  GITHUB: {
    GET_REPOS: "/api/github/repos",
    GET_CONTENTS: "/api/github/contents",
    GET_BRANCHES: "/api/github/branches",
  },
  PROJECTS: {
    CREATE: "/api/projects",
    GET_ALL: "/api/projects",               
    DELETE: (id) => `/api/projects/${id}`,   
  },
  WEBHOOKS: {
    GITHUB: "/api/webhooks/github",
  },
  DEPLOYMENTS: {
    GET_ALL: "/api/deployments",  
    GET_STATUS: (id) => `/api/deployments/${id}`,
    GET_LOGS: (id) => `/api/deployments/${id}/logs`,
  },
};