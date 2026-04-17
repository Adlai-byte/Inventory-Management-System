#!/bin/bash
# ==========================================
# BASTISTIL Inventory - Deployment Script
# ==========================================

set -e

# Configuration
IMAGE_NAME="bastistil/inventory-app"
TAG="${1:-latest}"
REGISTRY="${DOCKER_REGISTRY:-docker.io}"

echo "Building and tagging image..."
docker build -t ${IMAGE_NAME}:${TAG} .
docker tag ${IMAGE_NAME}:${TAG} ${IMAGE_NAME}:${TAG}

# Push to registry if configured
if [ -n "$DOCKER_REGISTRY" ]; then
    echo "Pushing to registry..."
    docker push ${IMAGE_NAME}:${TAG}
    echo "Image pushed to ${DOCKER_REGISTRY}/${IMAGE_NAME}:${TAG}"
else
    echo "Build complete. To push to a registry:"
    echo "  docker tag ${IMAGE_NAME}:${TAG} yourregistry/${IMAGE_NAME}:${TAG}"
    echo "  docker push yourregistry/${IMAGE_NAME}:${TAG}"
fi

echo "Done!"
