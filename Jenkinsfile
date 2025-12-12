pipeline {

    agent any

    environment {
        DOCKERHUB_USER = credentials('dockerhub-username')
        DOCKERHUB_PASS = credentials('dockerhub-password')

        FRONTEND_REPO = "9808nikhil/mean-chat-frontend"
        BACKEND_REPO  = "9808nikhil/mean-chat-backend"

        VERSION = "${env.GIT_COMMIT[0..7]}-${env.BUILD_NUMBER}"
    }

    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '15'))
    }

    stages {

        /* Checkout */
        stage('Checkout') {
            steps {
                checkout scm
                sh "echo 'Building version: ${VERSION}'"
            }
        }

        /* FRONTEND BUILD USING DOCKER (no node required on Jenkins) */
        stage('Build Frontend') {
            steps {
                sh '''
                    echo "Building Angular frontend inside Docker..."

                    docker run --rm \
                        -v $PWD/frontend:/app \
                        -w /app \
                        node:20-alpine \
                        sh -c "npm install -g yarn @angular/cli && yarn install --frozen-lockfile && ng build --configuration production --output-path=dist"
                '''
            }
        }

        /* BACKEND BUILD USING DOCKER */
        stage('Build Backend') {
            steps {
                sh '''
                    echo "Building backend inside Docker..."

                    docker run --rm \
                        -v $PWD/backend:/app \
                        -w /app \
                        node:20-alpine \
                        sh -c "npm install -g yarn && yarn install --frozen-lockfile"
                '''
            }
        }

        /* DOCKER BUILD IMAGES */
        stage('Build Docker Images') {
            steps {
                sh '''
                    echo "Building Docker images..."

                    docker build -t ${FRONTEND_REPO}:${VERSION}  -f frontend/Dockerfile frontend
                    docker build -t ${BACKEND_REPO}:${VERSION}   -f backend/Dockerfile backend
                '''
            }
        }

        /* PUSH IMAGES */
        stage('Push Docker Images') {
            steps {
                sh '''
                    echo "$DOCKERHUB_PASS" | docker login -u "$DOCKERHUB_USER" --password-stdin
                    
                    docker push ${FRONTEND_REPO}:${VERSION}
                    docker push ${BACKEND_REPO}:${VERSION}

                    docker logout
                '''
            }
        }

        /* DEPLOY TO KUBERNETES */
        stage('Deploy to Kubernetes') {
            steps {
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONF')]) {
                    sh '''
                        export KUBECONFIG=$KUBECONF

                        echo "Deploying to Kubernetes..."

                        kubectl set image deployment/frontend-app frontend=${FRONTEND_REPO}:${VERSION} --record || true
                        kubectl set image deployment/backend-app backend=${BACKEND_REPO}:${VERSION} --record || true

                        kubectl rollout status deployment/frontend-app --timeout=120s || true
                        kubectl rollout status deployment/backend-app --timeout=120s || true
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "🚀 Deployment successful! Version: ${VERSION}"
        }
        failure {
            echo "❌ Deployment failed. See logs above."
        }
    }
}
