pipeline {
    agent any
    stages {
        stage('Get Code') {
            steps {
                git branch: 'develop', url: 'https://github.com/viktorcito/todo-list-aws.git'
            }
        }
        stage('Static Test') {
            steps {
                sh '''
                    flake8 --exit-zero --format=pylint src/ > flake8.out
                    bandit -r src/ --exit-zero -f custom -o bandit.out --msg-template "{abspath}:{line}: [{test_id}] {msg}"
                '''
                recordIssues tools: [flake8(pattern: 'flake8.out')]
                recordIssues tools: [pyLint(name: 'Bandit', pattern: 'bandit.out')]
            }
        }
        stage('Deploy') {
            steps {
                sh 'sam build'
                sh '''
                    sam deploy \
                        --stack-name todo-list-aws-staging \
                        --resolve-s3 \
                        --no-confirm-changeset \
                        --no-fail-on-empty-changeset \
                        --parameter-overrides Stage=staging \
                        --region us-east-1 \
                        --capabilities CAPABILITY_IAM
                '''
            }
        }
        stage('Rest Test') {
            steps {
                script {
                    env.BASE_URL = sh(
                        script: "aws cloudformation describe-stacks --stack-name todo-list-aws-staging --query 'Stacks[0].Outputs[?OutputKey==\\`BaseUrlApi\\`].OutputValue' --region us-east-1 --output text",
                        returnStdout: true
                    ).trim()
                }
                sh '''
                    pip3 install requests
                    export BASE_URL=${BASE_URL}
                    pytest test/integration/todoApiTest.py -v -s
                '''
            }
        }
        stage('Promote') {
            steps {
                sh '''
                    git checkout master
                    git merge develop
                    git push origin master
                '''
            }
        }
    }
    post {
        always {
            cleanWs()
        }
    }
}
