import axios from "axios";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { encryptToken } from "../utils/crypto.js";
import { ENV } from "../lib/env.js";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";


export const getGithubAuthUrl = (): string => {
  const rootUrl = "https://github.com/login/oauth/authorize";
  const options = {
    client_id: ENV.GITHUB_CLIENT_ID,
    redirect_uri: `${ENV.API_URL}/api/auth/github/callback`,  //its uri Uniform Resource Identifier not url.
    scope: "user:email repo", 
  };
  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
};

export const getGithubToken = async (code: string): Promise<string> => {
  const url = "https://github.com/login/oauth/access_token";
  const values = {
    client_id: ENV.GITHUB_CLIENT_ID,
    client_secret: ENV.GITHUB_CLIENT_SECRET,
    code,
  };

  const res = await axios.post(url, values, {
    headers: { Accept: "application/json" },
  });

  if (res.data.error) {
    throw new Error(`GitHub OAuth Error: ${res.data.error_description}`);
  }

  return res.data.access_token; // This is the raw token!
};

export const getGithubUser = async (access_token: string) => {
  const res = await axios.get("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  return res.data;
};

export const handleGithubCallback = async (code: string) => {
  try {
    
    if (!code) {
      return { success: false, statusCode: 400, message: "No code provided by GitHub" };
    }

    
    const rawGithubToken = await getGithubToken(code);
    const githubProfile = await getGithubUser(rawGithubToken);

    const email = githubProfile.email || `${githubProfile.login}@github.com`; 
    const githubId = githubProfile.id.toString();

    
    const encryptedToken = encryptToken(rawGithubToken);
    let [user] = await db.select().from(users).where(eq(users.githubId, githubId));

    if (!user) {
      [user] = await db.insert(users).values({ githubId, email, githubAccessToken: encryptedToken }).returning();
    } else {
      [user] = await db.update(users).set({ githubAccessToken: encryptedToken }).where(eq(users.githubId, githubId)).returning();
    }

    
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    
    return {
      success: true,
      statusCode: 200,
      data: { user, accessToken, refreshToken }
    };

  } catch (error: any) {
    
    if (error.response || error.message.includes("GitHub")) {
      return { success: false, statusCode: 400, message: "GitHub authentication failed or expired." };
    }
    
    
    throw error;
  }
};