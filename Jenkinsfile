pipeline {

    agent {
        label 'docker'   // or 'any' — use your Jenkins agent label
    }

    environment {
        DOCKERHUB_USER = credentials('dockerhub-username')
        DOCKERHUB_PASS = credentials('dockerhub-password')

        // Your DockerHub repo names
        FRONTEND_REPO = "9808nikhil/mean-chat-frontend"
        BACKEND_REPO  = "9808nikhil/mean-chat-backend"

        // versioning => commit-short-sha + build-number
        VERSION = "${env.GIT_COMMIT[0..7]}-${env.BUILD_NUMBER}"
    }

    options {
        timestamps()
        ansiColor('xterm')
        buildDiscarder(logRotator(numToKeepStr: '15'))
    }

    stages {

        /* -----------------------------------------
         *  Stage 1: Checkout from SCM
         * ----------------------------------------- */
        stage('Checkout') {
            steps {
                checkout scm
                sh "echo 'Building version: ${VERSION}'"
            }
        }

        /* -----------------------------------------
         *  Stage 2: Build Frontend (Angular)
         * ----------------------------------------- */
        stage('Build Frontend') {
            steps {
                dir('frontend') {
                    sh '''
                        echo "Installing Angular dependencies..."
                        yarn install --frozen-lockfile

                        echo "Building Angular production bundle..."
                        ./node_modules/.bin/ng build --configuration production --output-path=dist
                    '''
                }
            }
        }

        /* -----------------------------------------
         *  Stage 3: Build Backend (Node.js)
         * ----------------------------------------- */
        stage('Build Backend') {
            steps {
                dir('backend') {
                    sh '''
                        echo "Installing backend dependencies..."
                        yarn install --frozen-lockfile

                        # If backend uses TypeScript, enable:
                        # yarn build
                    '''
                }
            }
        }

        /* -----------------------------------------
         *  Stage 4: Create Docker Images
         * ----------------------------------------- */
        stage('Build Docker Images') {
            steps {
                sh '''
                    echo "Building Docker images..."

                    docker build -t ${FRONTEND_REPO}:${VERSION}  -f frontend/Dockerfile frontend
                    docker build -t ${BACKEND_REPO}:${VERSION}   -f backend/Dockerfile backend
                '''
            }
        }

        /* -----------------------------------------
         *  Stage 5: Push Docker Images
         * ----------------------------------------- */
        stage('Push Images') {
            steps {
                sh '''
                    echo "$DOCKERHUB_PASS" | docker login -u "$DOCKERHUB_USER" --password-stdin
                    
                    docker push ${FRONTEND_REPO}:${VERSION}
                    docker push ${BACKEND_REPO}:${VERSION}

                    docker logout
                '''
            }
        }

        /* -----------------------------------------
         *  Stage 6: Deploy to Kubernetes
         * ----------------------------------------- */
        stage('Deploy to Kubernetes') {
            steps {
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONF')]) {
                    sh '''
                        export KUBECONFIG=$KUBECONF

                        echo "Updating frontend deployment..."
                        kubectl set image deployment/frontend-app \
                            frontend=${FRONTEND_REPO}:${VERSION} --record || true

                        echo "Updating backend deployment..."
                        kubectl set image deployment/backend-app \
                            backend=${BACKEND_REPO}:${VERSION} --record || true

                        echo "Waiting for rollout..."
                        kubectl rollout status deployment/frontend-app --timeout=90s || true
                        kubectl rollout status deployment/backend-app  --timeout=90s || true
                    '''
                }
            }
        }
    }

    /* -----------------------------------------
     *  Notifications / Post Actions
     * ----------------------------------------- */
    post {
        success {
            echo "🚀 Deployment successful! Version: ${VERSION}"
        }
        failure {
            echo "❌ Deployment failed. Check pipeline logs."
        }
    }
}
