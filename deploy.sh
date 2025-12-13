#!/bin/bash

# Master Deployment Script for MEAN Chat Application
# This script orchestrates the complete DevOps infrastructure setup

set -e  # Exit on any error

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

# Check if required tools are installed
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    local tools=("docker" "docker-compose" "terraform" "ansible" "kubectl" "aws" "helm")
    local missing_tools=()
    
    for tool in "${tools[@]}"; do
        if ! command -v $tool &> /dev/null; then
            missing_tools+=($tool)
        fi
    done
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing tools: ${missing_tools[*]}"
        echo "Please install the missing tools and try again."
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Setup environment variables
setup_environment() {
    print_info "Setting up environment variables..."
    
    # AWS Configuration
    if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
        print_warning "AWS credentials not found in environment variables"
        echo "Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
        read -p "Enter AWS Access Key ID: " aws_access_key
        read -s -p "Enter AWS Secret Access Key: " aws_secret_key
        echo ""
        export AWS_ACCESS_KEY_ID=$aws_access_key
        export AWS_SECRET_ACCESS_KEY=$aws_secret_key
    fi
    
    # Terraform variables
    export TF_VAR_aws_region=${AWS_REGION:-"us-east-1"}
    export TF_VAR_cluster_name=${CLUSTER_NAME:-"chat-app-cluster"}
    export TF_VAR_environment=${ENVIRONMENT:-"production"}
    export TF_VAR_domain_name=${DOMAIN_NAME:-"chat-app.example.com"}
    
    print_success "Environment variables configured"
}

# Build Docker images
build_docker_images() {
    print_info "Building Docker images..."
    
    # Build Jenkins image
    print_info "Building Jenkins image..."
    docker build -f Dockerfile.jenkins -t jenkins-mean-chat .
    
    # Build backend image
    print_info "Building backend image..."
    docker build -t chat-backend:latest ./backend
    
    # Build frontend image
    print_info "Building frontend image..."
    docker build -t chat-frontend:latest ./frontend
    
    # Build main application image
    print_info "Building main application image..."
    docker build -t chat-app:latest .
    
    print_success "Docker images built successfully"
}

# Start Jenkins
start_jenkins() {
    print_info "Starting Jenkins..."
    
    # Start Jenkins with Docker Compose
    docker-compose -f docker-compose.jenkins.yml up -d
    
    # Wait for Jenkins to be ready
    print_info "Waiting for Jenkins to start..."
    sleep 30
    
    # Get Jenkins initial admin password
    JENKINS_PASSWORD=$(docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword)
    
    print_success "Jenkins started successfully"
    print_info "Jenkins URL: http://localhost:8080"
    print_info "Initial Admin Password: $JENKINS_PASSWORD"
    
    # Save password to file for later use
    echo "$JENKINS_PASSWORD" > jenkins_password.txt
}

# Deploy infrastructure with Terraform
deploy_infrastructure() {
    print_info "Deploying infrastructure with Terraform..."
    
    cd terraform
    
    # Initialize Terraform
    terraform init
    
    # Validate configuration
    terraform validate
    
    # Plan deployment
    terraform plan -out=tfplan
    
    # Ask for confirmation
    read -p "Do you want to apply the Terraform plan? (y/N): " confirm
    if [[ $confirm =~ ^[Yy]$ ]]; then
        terraform apply tfplan
        print_success "Infrastructure deployed successfully"
    else
        print_warning "Terraform deployment cancelled"
        return 1
    fi
    
    # Get outputs
    terraform output -json > ../terraform_outputs.json
    
    cd ..
    
    print_success "Infrastructure deployment completed"
}

# Configure Kubernetes
configure_kubernetes() {
    print_info "Configuring Kubernetes..."
    
    # Update kubeconfig
    print_info "Updating kubeconfig..."
    aws eks update-kubeconfig --region $TF_VAR_aws_region --name $TF_VAR_cluster_name
    
    # Test connectivity
    kubectl get nodes
    
    print_success "Kubernetes configured successfully"
}

# Deploy to Kubernetes
deploy_to_kubernetes() {
    print_info "Deploying application to Kubernetes..."
    
    # Apply namespace and basic resources
    kubectl apply -f kubernetes/namespace.yaml
    
    # Deploy monitoring stack
    print_info "Deploying monitoring stack..."
    kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
    kubectl apply -f monitoring/
    
    # Wait for deployments
    print_info "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available --timeout=600s deployment/chat-backend -n chat-app || true
    kubectl wait --for=condition=available --timeout=600s deployment/chat-frontend -n chat-app || true
    
    print_success "Application deployed to Kubernetes"
}

# Setup monitoring
setup_monitoring() {
    print_info "Setting up monitoring..."
    
    # Add Helm repositories
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add grafana https://grafana.github.io/helm-charts
    helm repo update
    
    # Install kube-prometheus-stack
    helm install monitoring prometheus-community/kube-prometheus-stack \
        --namespace monitoring \
        --create-namespace \
        --set grafana.adminPassword=admin123
    
    print_success "Monitoring stack installed"
}

# Display deployment status
display_status() {
    print_info "Deployment Status:"
    echo ""
    
    # Jenkins status
    echo "Jenkins: http://localhost:8080"
    echo "Jenkins Password: $(cat jenkins_password.txt 2>/dev/null || echo 'Not available')"
    echo ""
    
    # Kubernetes status
    echo "Kubernetes Applications:"
    kubectl get all -n chat-app
    echo ""
    
    echo "Kubernetes Ingress:"
    kubectl get ingress -n chat-app
    echo ""
    
    echo "Monitoring:"
    kubectl get pods -n monitoring
    echo ""
    
    # URLs
    echo "Access URLs:"
    echo "- Frontend: Check ingress IP/DNS"
    echo "- Backend API: Check ingress IP/DNS"
    echo "- Grafana: kubectl port-forward svc/grafana 3000:80 -n monitoring"
    echo "- Prometheus: kubectl port-forward svc/prometheus-server 9090:80 -n monitoring"
}

# Cleanup function
cleanup() {
    print_info "Cleaning up..."
    
    # Stop Jenkins
    docker-compose -f docker-compose.jenkins.yml down
    
    print_success "Cleanup completed"
}

# Main execution
main() {
    print_info "Starting MEAN Chat Application DevOps Deployment"
    echo "============================================="
    
    # Parse command line arguments
    case "${1:-all}" in
        "prerequisites")
            check_prerequisites
            ;;
        "jenkins")
            check_prerequisites
            build_docker_images
            start_jenkins
            ;;
        "infrastructure")
            check_prerequisites
            setup_environment
            deploy_infrastructure
            ;;
        "kubernetes")
            configure_kubernetes
            deploy_to_kubernetes
            ;;
        "monitoring")
            setup_monitoring
            ;;
        "status")
            display_status
            ;;
        "cleanup")
            cleanup
            ;;
        "all")
            check_prerequisites
            setup_environment
            build_docker_images
            start_jenkins
            deploy_infrastructure
            configure_kubernetes
            deploy_to_kubernetes
            setup_monitoring
            display_status
            ;;
        *)
            echo "Usage: $0 {all|jenkins|infrastructure|kubernetes|monitoring|status|cleanup|prerequisites}"
            echo ""
            echo "Commands:"
            echo "  all          - Run complete deployment (default)"
            echo "  prerequisites - Check required tools"
            echo "  jenkins      - Build and start Jenkins"
            echo "  infrastructure - Deploy Terraform infrastructure"
            echo "  kubernetes   - Deploy to Kubernetes"
            echo "  monitoring   - Setup monitoring stack"
            echo "  status       - Show deployment status"
            echo "  cleanup      - Stop and clean up services"
            exit 1
            ;;
    esac
}

# Trap errors
trap 'print_error "Deployment failed on line $LINENO"' ERR

# Run main function
main "$@"
