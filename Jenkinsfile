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
    }

    post {
        success {
            echo '✅ Repo fetched successfully'
        }
        failure {
            echo '❌ Fetch failed'
        }
    }
}
