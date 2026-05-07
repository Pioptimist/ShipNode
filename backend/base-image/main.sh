#!/bin/bash
set -e
# 1. Echo a startup message for our Live Logs!
echo "Shipnode Sandbox Initialized"

# 2. These variables will be injected by our Node Worker later when it calls 'docker run'
export REPO_URL="$REPO_URL"
export COMMIT_HASH="$COMMIT_HASH"
export ROOT_DIR="$ROOT_DIR"
export INSTALL_CMD="$INSTALL_CMD"
export BUILD_CMD="$BUILD_CMD"
export WORKSPACE_DIR="/home/app/workspace"

echo "Cloning Repository..."
# Clone the repo into a folder called 'workspace'
git clone "$REPO_URL" "$WORKSPACE_DIR"

# Move into the workspace and checkout the specific commit the webhook told us about
cd "$WORKSPACE_DIR"
git checkout "$COMMIT_HASH"

# Move into the specific project directory inside the monorepo
echo "Navigating to root directory: $ROOT_DIR"
cd "$WORKSPACE_DIR/$ROOT_DIR"  
# notice we are using absolute path here to avoid any confusion about where we are in the filesystem not relative so it wont throw an error

echo "Installing Dependencies..."
if [ -n "$INSTALL_CMD" ] && [ "$INSTALL_CMD" != "null" ]; then
    echo "Running ($INSTALL_CMD)..."
    eval "$INSTALL_CMD"
else
    echo "Skipping install command (not provided or null)."
fi

echo "Building Project..."
if [ -n "$BUILD_CMD" ] && [ "$BUILD_CMD" != "null" ]; then
    echo "Running ($BUILD_CMD)..."
    eval "$BUILD_CMD"
else
    echo "Skipping build command (not provided or null)."
fi

echo "Build Complete! Launching Cloudflare R2 Uploader..."

# 5. Call the Node.js script we baked into the image earlier
node /home/app/upload.js