ARG BASE=node:20.18.0
FROM ${BASE} AS base

WORKDIR /app

# Install dependencies (this step is cached as long as the dependencies don't change)
COPY package.json pnpm-lock.yaml ./

ENV NODE_OPTIONS="--max-old-space-size=4096"

#RUN npm install -g corepack@latest

#RUN corepack enable pnpm && pnpm install
RUN npm install -g pnpm && pnpm install

# Copy the rest of your app's source code
COPY . .

# Expose the port the app runs on
EXPOSE 5173

# Production image
FROM base AS bolt-ai-production

# Define build arguments for production
ARG ANTHROPIC_API_KEY
ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ARG AWS_REGION
ARG AWS_AMPLIFY_BUCKET
ARG GITHUB_TOKEN
ARG VITE_GITHUB_ACCESS_TOKEN
ARG VITE_GITHUB_TOKEN_TYPE
ARG MONGODB_CONNECTION_STRING
ARG MONGODB_URI
ARG API_ROOT_URL
ARG WIDER_APP_URL
ARG VITE_LOG_LEVEL

# Set environment variables for production
ENV WRANGLER_SEND_METRICS=false \
    RUNNING_IN_DOCKER=true \
    NODE_ENV=production \
    ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY} \
    AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID} \
    AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY} \
    AWS_REGION=${AWS_REGION} \
    AWS_AMPLIFY_BUCKET=${AWS_AMPLIFY_BUCKET} \
    GITHUB_TOKEN=${GITHUB_TOKEN} \
    VITE_GITHUB_ACCESS_TOKEN=${VITE_GITHUB_ACCESS_TOKEN} \
    VITE_GITHUB_TOKEN_TYPE=${VITE_GITHUB_TOKEN_TYPE} \
    MONGODB_CONNECTION_STRING=${MONGODB_CONNECTION_STRING} \
    MONGODB_URI=${MONGODB_URI} \
    API_ROOT_URL=${API_ROOT_URL} \
    WIDER_APP_URL=${WIDER_APP_URL} \
    VITE_LOG_LEVEL=${VITE_LOG_LEVEL}

# Pre-configure wrangler to disable metrics
RUN mkdir -p /root/.config/.wrangler && \
    echo '{"enabled":false}' > /root/.config/.wrangler/metrics.json

RUN pnpm run build

CMD [ "sh", "-c", "PORT=5173 pnpm run start:prod"]

# Development image
FROM base AS bolt-ai-development

# Define the same environment variables for development
ARG GROQ_API_KEY
ARG HuggingFace 
ARG OPENAI_API_KEY
ARG ANTHROPIC_API_KEY
ARG OPEN_ROUTER_API_KEY
ARG GOOGLE_GENERATIVE_AI_API_KEY
ARG OLLAMA_API_BASE_URL
ARG XAI_API_KEY
ARG TOGETHER_API_KEY
ARG TOGETHER_API_BASE_URL
ARG VITE_LOG_LEVEL=debug
ARG DEFAULT_NUM_CTX

ENV GROQ_API_KEY=${GROQ_API_KEY} \
    HuggingFace_API_KEY=${HuggingFace_API_KEY} \
    OPENAI_API_KEY=${OPENAI_API_KEY} \
    ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY} \
    OPEN_ROUTER_API_KEY=${OPEN_ROUTER_API_KEY} \
    GOOGLE_GENERATIVE_AI_API_KEY=${GOOGLE_GENERATIVE_AI_API_KEY} \
    OLLAMA_API_BASE_URL=${OLLAMA_API_BASE_URL} \
    XAI_API_KEY=${XAI_API_KEY} \
    TOGETHER_API_KEY=${TOGETHER_API_KEY} \
    TOGETHER_API_BASE_URL=${TOGETHER_API_BASE_URL} \
    AWS_BEDROCK_CONFIG=${AWS_BEDROCK_CONFIG} \
    VITE_LOG_LEVEL=${VITE_LOG_LEVEL} \
    DEFAULT_NUM_CTX=${DEFAULT_NUM_CTX}\
    RUNNING_IN_DOCKER=true

RUN mkdir -p ${WORKDIR}/run
CMD pnpm run dev --host
