pipeline {
    agent any

    environment {
        GIT_REPO        = 'https://github.com/nikhil-garia/mean-private-chat-app.git'
        GIT_CREDENTIALS = 'github-token'
        IMAGE           = "9808nikhil/nextalk:latest"
    }

    stages {

        // 1️⃣ Clean Jenkins Workspace
        stage('Clean Workspace') {
            steps {
                deleteDir()
            }
        }

        // 2️⃣ Fetch Code from GitHub
        stage('Fetch Code') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/main']],
                    userRemoteConfigs: [[
                        url: "${GIT_REPO}",
                        credentialsId: "${GIT_CREDENTIALS}"
                    ]]
                ])
            }
        }

        // ----------------------------
        // CREATE BACKEND .env
        // ----------------------------
        stage('Create Backend .env') {
            environment {
                STADIA_API_KEY   = credentials('STADIA_API_KEY')
                OPENAI_API_KEY   = credentials('OPENAI_API_KEY')
                GEMINI_API_KEY   = credentials('GEMINI_API_KEY')
                MONGO_URL        = credentials('MONGO_URL')
                FCM_PROJECT_ID   = credentials('FCM_PROJECT_ID')
                SESSION_SECRET    = credentials('SESSION_SECRET')
            }
            steps {
                sh '''
                    echo "STADIA_API_KEY=${STADIA_API_KEY}" > backend/.env
                    echo "OPENAI_API_KEY=${OPENAI_API_KEY}" >> backend/.env
                    echo "GEMINI_API_KEY=${GEMINI_API_KEY}" >> backend/.env
                    echo "MONGO_URL=${MONGO_URL}" >> backend/.env
                    echo "FCM_PROJECT_ID=${FCM_PROJECT_ID}" >> backend/.env
                    echo "SESSION_SECRET=${SESSION_SECRET}" >> backend/.env
                    echo "PORT=8080" >> backend/.env
                    echo "NODE_ENV=production" >> backend/.env
                '''
            }
        }

        // ----------------------------
        // CREATE ANGULAR environment.prod.ts
        // ----------------------------
        stage('Create Angular Environment') {
            environment {
                API_URL         = credentials('API_URL')
                SOCKET_URL      = credentials('SOCKET_URL')
                GOOGLE_CLIENT_ID = credentials("GOOGLE_CLIENT_ID")
            }
            steps {
                sh '''
                    mkdir -p frontend/src/environments
                    cat > frontend/src/environments/environment.prod.ts <<EOF
export const environment = {
    production: true,
    apiUrl: '${API_URL}',
    socketUrl: '${SOCKET_URL}',
    clientId: '${GOOGLE_CLIENT_ID}'
};
EOF
                '''
            }
        }

        // ----------------------------
        // INSTALL NPM DEPENDENCIES
        // ----------------------------
        stage('Install NPM Dependencies') {
            steps {
                sh "npm install"
            }
        }

        // ----------------------------
        // BUILD DOCKER IMAGE
        // ----------------------------
        stage('Build Docker Image') {
            steps {
                sh "docker build -t nextalk ."
            }
        }

        // ----------------------------
        // PUSH DOCKER IMAGE TO DOCKERHUB
        // ----------------------------
        stage('Tag & Push to DockerHub') {
            steps {
                script {
                    withDockerRegistry(credentialsId: 'docker') {
                        sh "docker tag nextalk ${IMAGE}"
                        sh "docker push ${IMAGE}"
                    }
                }
            }
        }

        // ❌ REMOVED: Deploy to GCP VM
    }

    post {
        success {
            echo "🚀 Build completed and Docker pushed successfully!"
        }
        failure {
            echo "❌ Pipeline failed. Check logs."
        }
    }
}
