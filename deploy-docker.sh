#!/bin/bash

# Docker Production Deployment Script for Wider Builder
# This script builds and runs the production Docker container with proper credential handling

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="wider-builder-prod"
IMAGE_NAME="wider-builder:prod"
PORT="5173"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if required environment variables are set
check_env_vars() {
    print_status "Checking required environment variables..."
    
    local missing_vars=()
    
    # Check critical environment variables
    if [ -z "$ANTHROPIC_API_KEY" ]; then
        missing_vars+=("ANTHROPIC_API_KEY")
    fi
    
    if [ -z "$AWS_ACCESS_KEY_ID" ]; then
        missing_vars+=("AWS_ACCESS_KEY_ID")
    fi
    
    if [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
        missing_vars+=("AWS_SECRET_ACCESS_KEY")
    fi
    
    if [ -z "$GITHUB_TOKEN" ]; then
        missing_vars+=("GITHUB_TOKEN")
    fi
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        echo ""
        print_warning "Please set these variables in your .env.production file or export them:"
        echo "  export ANTHROPIC_API_KEY='your-key-here'"
        echo "  export AWS_ACCESS_KEY_ID='your-key-here'"
        echo "  export AWS_SECRET_ACCESS_KEY='your-key-here'"
        echo "  export GITHUB_TOKEN='your-token-here'"
        echo ""
        print_warning "Or copy .env.production.template to .env.production and fill in the values"
        exit 1
    fi
    
    print_success "All required environment variables are set"
}

# Function to load environment variables from .env.production if it exists
load_env_file() {
    if [ -f ".env.production" ]; then
        print_status "Loading environment variables from .env.production..."
        export $(grep -v '^#' .env.production | xargs)
        print_success "Environment variables loaded from .env.production"
    else
        print_warning ".env.production file not found. Using system environment variables."
        print_warning "Consider creating .env.production from .env.production.template"
    fi
}

# Function to stop and remove existing container
cleanup_existing() {
    if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
        print_status "Stopping existing container: $CONTAINER_NAME"
        docker stop $CONTAINER_NAME
    fi
    
    if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
        print_status "Removing existing container: $CONTAINER_NAME"
        docker rm $CONTAINER_NAME
    fi
}

# Function to build Docker image
build_image() {
    print_status "Building Docker image: $IMAGE_NAME"
    
    docker build \
        --target bolt-ai-production \
        --build-arg ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
        --build-arg AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
        --build-arg AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
        --build-arg AWS_REGION="${AWS_REGION:-eu-west-2}" \
        --build-arg GITHUB_TOKEN="$GITHUB_TOKEN" \
        --build-arg VITE_GITHUB_ACCESS_TOKEN="${VITE_GITHUB_ACCESS_TOKEN:-$GITHUB_TOKEN}" \
        --build-arg VITE_GITHUB_TOKEN_TYPE="${VITE_GITHUB_TOKEN_TYPE:-classic}" \
        --build-arg MONGODB_CONNECTION_STRING="$MONGODB_CONNECTION_STRING" \
        --build-arg MONGODB_URI="$MONGODB_URI" \
        --build-arg AWS_AMPLIFY_BUCKET="${AWS_AMPLIFY_BUCKET:-wider-ai-websites}" \
        --build-arg VITE_LOG_LEVEL="${VITE_LOG_LEVEL:-error}" \
        -t $IMAGE_NAME .
    
    print_success "Docker image built successfully: $IMAGE_NAME"
}

# Function to run Docker container
run_container() {
    print_status "Starting Docker container: $CONTAINER_NAME"
    
    docker run -d \
        --name $CONTAINER_NAME \
        -p $PORT:5173 \
        -e NODE_ENV=production \
        -e RUNNING_IN_DOCKER=true \
        -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
        -e AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID" \
        -e AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY" \
        -e AWS_REGION="${AWS_REGION:-eu-west-2}" \
        -e GITHUB_TOKEN="$GITHUB_TOKEN" \
        -e VITE_GITHUB_ACCESS_TOKEN="${VITE_GITHUB_ACCESS_TOKEN:-$GITHUB_TOKEN}" \
        -e VITE_GITHUB_TOKEN_TYPE="${VITE_GITHUB_TOKEN_TYPE:-classic}" \
        -e MONGODB_CONNECTION_STRING="$MONGODB_CONNECTION_STRING" \
        -e MONGODB_URI="$MONGODB_URI" \
        -e AWS_AMPLIFY_BUCKET="${AWS_AMPLIFY_BUCKET:-wider-ai-websites}" \
        -e VITE_LOG_LEVEL="${VITE_LOG_LEVEL:-error}" \
        --restart unless-stopped \
        $IMAGE_NAME
    
    print_success "Docker container started successfully: $CONTAINER_NAME"
}

# Function to show container status
show_status() {
    print_status "Container status:"
    docker ps -f name=$CONTAINER_NAME
    
    echo ""
    print_status "Container logs (last 20 lines):"
    docker logs --tail 20 $CONTAINER_NAME
    
    echo ""
    print_success "Application should be available at: http://localhost:$PORT"
    print_status "To view live logs: docker logs -f $CONTAINER_NAME"
    print_status "To stop container: docker stop $CONTAINER_NAME"
}

# Function to test the deployment
test_deployment() {
    print_status "Testing deployment..."
    
    # Wait for container to start
    sleep 10
    
    # Test health endpoint
    if curl -f http://localhost:$PORT/api/health > /dev/null 2>&1; then
        print_success "Health check passed! Application is running correctly."
    else
        print_warning "Health check failed. Container might still be starting..."
        print_status "Check logs with: docker logs $CONTAINER_NAME"
    fi
}

# Main deployment function
main() {
    echo "🚀 Starting Docker Production Deployment for Wider Builder"
    echo "=================================================="
    
    # Load environment variables
    load_env_file
    
    # Check required environment variables
    check_env_vars
    
    # Clean up existing container
    cleanup_existing
    
    # Build new image
    build_image
    
    # Run new container
    run_container
    
    # Show status
    show_status
    
    # Test deployment
    test_deployment
    
    echo ""
    echo "=================================================="
    print_success "🎉 Deployment completed successfully!"
    echo "=================================================="
}

# Handle command line arguments
case "${1:-}" in
    "build")
        load_env_file
        check_env_vars
        build_image
        ;;
    "run")
        load_env_file
        check_env_vars
        cleanup_existing
        run_container
        show_status
        ;;
    "stop")
        print_status "Stopping container: $CONTAINER_NAME"
        docker stop $CONTAINER_NAME 2>/dev/null || true
        print_success "Container stopped"
        ;;
    "logs")
        docker logs -f $CONTAINER_NAME
        ;;
    "status")
        show_status
        ;;
    "restart")
        print_status "Restarting container: $CONTAINER_NAME"
        docker restart $CONTAINER_NAME
        show_status
        ;;
    "clean")
        cleanup_existing
        print_status "Removing Docker image: $IMAGE_NAME"
        docker rmi $IMAGE_NAME 2>/dev/null || true
        print_success "Cleanup completed"
        ;;
    *)
        main
        ;;
esac
