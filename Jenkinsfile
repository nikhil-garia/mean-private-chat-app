pipeline {
    agent any
    
    environment {
        NODE_VERSION = '18'
        DOCKER_REGISTRY = 'your-registry.com'
        APP_NAME = 'my-app'
    }
    
    stages {
        stage('Checkout') {
            steps {
                script {
                    echo 'Checking out source code...'
                    checkout scm
                }
            }
        }
        
        stage('Environment Info') {
            steps {
                script {
                    echo '=== Environment Information ==='
                    echo "Jenkins URL: ${env.JENKINS_URL}"
                    echo "Workspace: ${env.WORKSPACE}"
                    echo "BUILD_ID: ${env.BUILD_ID}"
                    echo "BUILD_NUMBER: ${env.BUILD_NUMBER}"
                    echo "JOB_NAME: ${env.JOB_NAME}"
                    echo "NODE_NAME: ${env.NODE_NAME}"
                }
            }
        }
        
        stage('Install Dependencies') {
            steps {
                script {
                    echo 'Installing dependencies...'
                    // For Node.js projects
                    sh 'npm --version || echo "npm not available"'
                    sh 'node --version || echo "node not available"'
                    
                    // For Python projects (if applicable)
                    sh 'python --version || echo "python not available"'
                    sh 'pip --version || echo "pip not available"'
                    
                    // For Java/Maven projects (if applicable)
                    sh 'mvn --version || echo "maven not available"'
                    sh 'java -version || echo "java not available"'
                }
            }
        }
        
        stage('Code Quality') {
            steps {
                script {
                    echo 'Running code quality checks...'
                    // Add your linting tools here
                    sh 'echo "Running linters..."'
                    
                    // Example: ESLint for JavaScript
                    // sh 'npm run lint'
                    
                    // Example: Flake8 for Python
                    // sh 'flake8 .'
                }
            }
        }
        
        stage('Security Scan') {
            steps {
                script {
                    echo 'Running security scans...'
                    // Add your security scanning tools here
                    sh 'echo "Running security scans..."'
                    
                    // Example: npm audit
                    // sh 'npm audit --audit-level=moderate'
                }
            }
        }
        
        stage('Tests') {
            steps {
                script {
                    echo 'Running tests...'
                    // Add your test commands here
                    sh 'echo "Running unit tests..."'
                    
                    // Example: Jest for JavaScript
                    // sh 'npm test'
                    
                    // Example: pytest for Python
                    // sh 'pytest'
                }
            }
        }
        
        stage('Build') {
            steps {
                script {
                    echo 'Building application...'
                    // Add your build commands here
                    sh 'echo "Building application..."'
                    
                    // Example: npm build
                    // sh 'npm run build'
                    
                    // Example: Docker build
                    // sh 'docker build -t ${APP_NAME}:${BUILD_NUMBER} .'
                }
            }
        }
        
        stage('Archive Artifacts') {
            steps {
                script {
                    echo 'Archiving artifacts...'
                    // Archive build artifacts
                    archiveArtifacts artifacts: '**/dist/**, **/build/**, **/*.jar, **/*.war'
                    echo 'Artifacts archived successfully'
                }
            }
        }
        
        stage('Docker Build & Push') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo 'Building and pushing Docker image...'
                    // Add Docker commands here
                    // sh 'docker build -t ${APP_NAME}:${BUILD_NUMBER} .'
                    // sh 'docker tag ${APP_NAME}:${BUILD_NUMBER} ${DOCKER_REGISTRY}/${APP_NAME}:latest'
                    // sh 'docker push ${DOCKER_REGISTRY}/${APP_NAME}:${BUILD_NUMBER}'
                    // sh 'docker push ${DOCKER_REGISTRY}/${APP_NAME}:latest'
                }
            }
        }
        
        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                script {
                    echo 'Deploying to staging environment...'
                    // Add deployment commands here
                    // sh 'kubectl apply -f k8s/staging/'
                    // sh 'echo "Deployed to staging"'
                }
            }
        }
        
        stage('Deploy to Production') {
            when {
                allOf {
                    branch 'main'
                    expression { return env.BUILD_NUMBER.toInteger() % 10 == 0 } // Deploy every 10th build
                }
            }
            steps {
                script {
                    echo 'Deploying to production environment...'
                    // Add production deployment commands here
                    // sh 'kubectl apply -f k8s/production/'
                    // sh 'echo "Deployed to production"'
                }
            }
        }
    }
    
    post {
        always {
            script {
                echo '=== Build Summary ==='
                echo "Build: ${env.BUILD_NUMBER}"
                echo "Status: ${currentBuild.currentResult}"
                echo "Duration: ${currentBuild.duration}ms"
            }
        }
        
        success {
            script {
                echo '✅ Build completed successfully!'
                // Add success notifications here
                // emailext (
                //     subject: "Build Success: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                //     body: "Build completed successfully. Check console output at ${env.BUILD_URL}",
                //     to: "${env.CHANGE_AUTHOR_EMAIL}"
                // )
            }
        }
        
        failure {
            script {
                echo '❌ Build failed!'
                // Add failure notifications here
                // emailext (
                //     subject: "Build Failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                //     body: "Build failed. Check console output at ${env.BUILD_URL}",
                //     to: "${env.CHANGE_AUTHOR_EMAIL}"
                // )
            }
        }
        
        unstable {
            script {
                echo '⚠️ Build unstable!'
                // Add notifications for unstable builds
            }
        }
        
        cleanup {
            script {
                echo 'Cleaning up workspace...'
                // Clean up temporary files
                // deleteDir()
            }
        }
    }
}
