import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import axios from "axios";
import { decryptToken } from "../../utils/crypto.js";

export const fetchRepoContentsService = async (
  userId: number,
  repoOwner: string,
  repoName: string,
  path: string = ""
) => {
  // 1. Fetch user to get their encrypted token (exactly like your createProject logic)
  const [dbUser] = await db.select().from(users).where(eq(users.id, userId));

  if (!dbUser || !dbUser.githubAccessToken) {
    throw new Error("GITHUB_AUTH_FAILED"); // Throw a specific error flag for the controller to catch
  }

  // 2. Decrypt the token
  const githubToken = decryptToken(dbUser.githubAccessToken);

  // 3. Call GitHub API to get the folder contents
  // If 'path' is empty, it returns the root directory.
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json"
      }
    });

    // 4. Clean up the response to only return what React needs
    return response.data.map((item: any) => ({
      name: item.name,
      path: item.path,
      type: item.type, // 'dir' or 'file'
      sha: item.sha
    }));

  } catch (error: any) {
    console.error(`GitHub API Error fetching contents for ${path}:`, error.response?.data?.message || error.message);
    throw new Error("GITHUB_API_ERROR");
  }
};