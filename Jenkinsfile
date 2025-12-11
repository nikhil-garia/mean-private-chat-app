pipeline {
    agent any

    environment {
        IMAGE = "9808nikhil/nextalk:latest"
        GCP_VM = "34.58.92.73"
        GCP_USER = "ubuntu"
    }

    stages {

        // 1️⃣ Fetch Code
        stage('Fetch Code') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/main']],
                    userRemoteConfigs: [[
                        url: "https://github.com/nikhil-garia/mean-private-chat-app.git",
                        credentialsId: "github-token"
                    ]]
                ])
            }
        }

        // 2️⃣ Create backend .env
        stage("Create Backend Env") {
            environment {
                MONGO_URL = credentials("MONGO_URL")
                STADIA_API_KEY = credentials("STADIA_API_KEY")
                OPENAI_API_KEY = credentials("OPENAI_API_KEY")
                GEMINI_API_KEY = credentials("GEMINI_API_KEY")
                FCM_PROJECT_ID = credentials("FCM_PROJECT_ID")
            }
            steps {
                sh '''
                    echo "MONGO_URL=${MONGO_URL}" > backend/.env
                    echo "STADIA_API_KEY=${STADIA_API_KEY}" >> backend/.env
                    echo "OPENAI_API_KEY=${OPENAI_API_KEY}" >> backend/.env
                    echo "GEMINI_API_KEY=${GEMINI_API_KEY}" >> backend/.env
                    echo "FCM_PROJECT_ID=${FCM_PROJECT_ID}" >> backend/.env
                    echo "NODE_ENV=production" >> backend/.env
                    echo "PORT=3000" >> backend/.env
                '''
            }
        }

        // 3️⃣ Create Angular environment.prod.ts
        stage("Create Angular Env") {
    environment {
        API_URL = credentials("API_URL")
        SOCKET_URL = credentials("SOCKET_URL")
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

        // 4️⃣ Build Docker Image
        stage("Build Docker Image") {
            steps {
                sh "docker build -t nextalk ."
            }
        }

        // 5️⃣ Push Image to DockerHub
        stage("Push Image") {
            steps {
                withDockerRegistry([credentialsId: 'docker', url: 'https://index.docker.io/v1/']) {
                  sh "docker tag nextalk ${IMAGE}"
                  sh "docker push ${IMAGE}"
               }
            }
        }

        // 6️⃣ Deploy to GCP VM
        stage("Deploy to GCP") {
            environment {
                MONGO_URL = credentials("MONGO_URL")
                STADIA_API_KEY = credentials("STADIA_API_KEY")
                OPENAI_API_KEY = credentials("OPENAI_API_KEY")
                GEMINI_API_KEY = credentials("GEMINI_API_KEY")
                FCM_PROJECT_ID = credentials("FCM_PROJECT_ID")
                API_URL = credentials("API_URL")
                SOCKET_URL = credentials("SOCKET_URL")
            }
            steps {
                sshagent(["gcp-ssh-key"]) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${GCP_USER}@${GCP_VM} "
                            docker pull ${IMAGE} &&
                            docker stop nextalk || true &&
                            docker rm nextalk || true &&
                            docker run -d --name nextalk -p 3000:3000 \
                                -e MONGO_URL='${MONGO_URL}' \
                                -e STADIA_API_KEY='${STADIA_API_KEY}' \
                                -e OPENAI_API_KEY='${OPENAI_API_KEY}' \
                                -e GEMINI_API_KEY='${GEMINI_API_KEY}' \
                                -e FCM_PROJECT_ID='${FCM_PROJECT_ID}' \
                                -e API_URL='${API_URL}' \
                                -e SOCKET_URL='${SOCKET_URL}' \
                                -e NODE_ENV='production' \
                                ${IMAGE}
                        "
                    """
                }
            }
        }
    }

    post {
        success {
            echo "SUCCESS: Nextalk deployed 🎉"
        }
        failure {
            echo "ERROR: Deployment failed ❌"
        }
    }
}
