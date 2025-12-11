pipeline {
    agent any

    environment {
        GIT_REPO = 'https://github.com/nikhil-garia/mean-private-chat-app.git'
        GIT_CREDENTIALS = 'github-token'
    }

    stages {

        stage('Fetch Code Only') {
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

        stage('Install NPM Dependencies') {
            steps {
                sh "npm install"
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t nextalk ."
            }
        }

        stage('Tag & Push to DockerHub') {
            steps {
                script {
                    withDockerRegistry(credentialsId: 'docker') {
                        sh "docker tag nextalk 9808nikhil/nextalk:latest"
                        sh "docker push 9808nikhil/nextalk:latest"
                    }
                }
            }
        }
    }
}
