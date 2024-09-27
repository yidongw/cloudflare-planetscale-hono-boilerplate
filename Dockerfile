# Use the latest Node.js 18 base image
FROM node:18

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash

# Set Bun's directory to the PATH
ENV PATH="/root/.bun/bin:$PATH"

# Set the working directory
WORKDIR /app

# Copy package.json and bun.lockb if available
COPY package.json ./

# Install dependencies using Bun
RUN bun i

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on (optional, adjust according to your app)
EXPOSE 3000

# Command to run your application (adjust according to your app)
CMD ["bun", "run", "start"]
