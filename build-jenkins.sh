#!/bin/bash

# Jenkins Docker Build and Run Script
# This script builds and runs the Jenkins Docker container

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
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

# Function to check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are available"
}

# Function to stop and remove existing containers
cleanup() {
    print_info "Cleaning up existing containers..."
    docker-compose down -v 2>/dev/null || true
    docker system prune -f
    print_success "Cleanup completed"
}

# Function to build the Docker image
build_image() {
    print_info "Building Jenkins Docker image..."
    docker-compose build --no-cache
    print_success "Image built successfully"
}

# Function to run the container
run_container() {
    print_info "Starting Jenkins container..."
    docker-compose up -d
    print_success "Container started successfully"
}

# Function to wait for Jenkins to be ready
wait_for_jenkins() {
    print_info "Waiting for Jenkins to be ready..."
    for i in {1..60}; do
        if curl -s http://localhost:8080 > /dev/null; then
            print_success "Jenkins is ready!"
            return 0
        fi
        echo -n "."
        sleep 2
    done
    print_error "Jenkins failed to start within 120 seconds"
    return 1
}

# Function to show Jenkins admin password
show_password() {
    print_info "Retrieving Jenkins admin password..."
    PASSWORD=$(docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword 2>/dev/null || echo "Password not found")
    echo -e "${GREEN}Jenkins Admin Password: ${NC}$PASSWORD"
    print_info "Access Jenkins at: http://localhost:8080"
}

# Function to show logs
show_logs() {
    print_info "Showing Jenkins logs..."
    docker-compose logs -f jenkins
}

# Main script logic
main() {
    echo "=========================================="
    echo "         Jenkins Docker Setup"
    echo "=========================================="
    
    # Check if Docker is installed
    check_docker
    
    # Parse command line arguments
    case "${1:-build}" in
        "build")
            cleanup
            build_image
            run_container
            wait_for_jenkins
            show_password
            ;;
        "start")
            print_info "Starting Jenkins container..."
            docker-compose up -d
            wait_for_jenkins
            show_password
            ;;
        "stop")
            print_info "Stopping Jenkins container..."
            docker-compose down
            ;;
        "restart")
            print_info "Restarting Jenkins container..."
            docker-compose restart
            wait_for_jenkins
            ;;
        "logs")
            show_logs
            ;;
        "clean")
            cleanup
            print_success "All containers and images cleaned"
            ;;
        *)
            echo "Usage: $0 [build|start|stop|restart|logs|clean]"
            echo "  build   - Build and start Jenkins (default)"
            echo "  start   - Start existing Jenkins container"
            echo "  stop    - Stop Jenkins container"
            echo "  restart - Restart Jenkins container"
            echo "  logs    - Show Jenkins logs"
            echo "  clean   - Stop and remove all containers"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
