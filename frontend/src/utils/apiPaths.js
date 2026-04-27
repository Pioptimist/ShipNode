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
  },
  PROJECTS: {
    CREATE: "/api/projects",
  },
  WEBHOOKS: {
    GITHUB: "/api/webhooks/github",
  },
};
