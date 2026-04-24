FROM ubuntu:focal

# 1. Update Ubuntu and install essential tools
RUN apt-get update && apt-get install -y curl git build-essential

# 2. Install Node.js (v20)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs

# 3. Set up the working directory inside the container
WORKDIR /home/app

# Let's copy our tiny package.json first and install the upload tools
COPY package*.json .
RUN npm install

# 4. Copy our generic execution scripts into the container
COPY main.sh main.sh
COPY upload.js upload.js
RUN chmod +x main.sh

# 5. When the container starts, it will IMMEDIATELY run this script
ENTRYPOINT [ "/home/app/main.sh" ]