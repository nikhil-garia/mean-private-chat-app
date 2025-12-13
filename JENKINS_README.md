# Jenkins Docker Setup

This repository contains a complete Jenkins Docker setup with configuration files, scripts, and examples.

## Files Overview

- `Dockerfile` - Jenkins Docker image definition
- `docker-compose.yml` - Docker Compose configuration for easy deployment
- `jenkins.plugins` - List of Jenkins plugins to install
- `init.groovy` - Groovy script for Jenkins initialization
- `build-jenkins.sh` - Linux/macOS build script
- `build-jenkins.bat` - Windows build script
- `.dockerignore` - Files to exclude from Docker build context
- `Jenkinsfile` - Example Jenkins pipeline

## Prerequisites

- Docker installed and running
- Docker Compose installed
- At least 4GB of available RAM
- Port 8080 and 50000 available

## Quick Start

### Windows
```cmd
build-jenkins.bat
```

### Linux/macOS
```bash
./build-jenkins.sh
```

### Manual Docker Commands
```bash
# Build and run
docker-compose up -d --build

# Check logs
docker-compose logs -f jenkins

# Stop
docker-compose down
```

## Access Jenkins

1. Open browser and navigate to `http://localhost:8080`
2. Get initial admin password:
   ```bash
   # Windows
   docker exec jenkins type /var/jenkins_home/secrets/initialAdminPassword
   
   # Linux/macOS
   docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
   ```
3. Copy the password and paste it in the Jenkins setup wizard
4. Install suggested plugins or select custom plugins
5. Create your admin user

## Installed Plugins

The following plugins are pre-installed:
- Workflow Aggregator
- Git
- Pipeline Job
- Blue Ocean
- Docker Pipeline
- Maven/Gradle plugins
- Timestamper
- AnsiColor
- And more...

## Customization

### Adding More Plugins
Edit `jenkins.plugins` and add plugins (one per line):
```
plugin-name:version
```

### Custom Configuration
Edit `init.groovy` to add custom Jenkins configuration:
- User management
- Security settings
- Tool configuration
- Job templates

### Environment Variables
Modify `docker-compose.yml` to add environment variables:
```yaml
environment:
  - JENKINS_OPTS=--httpPort=8080 --httpsPort=-1
  - JENKINS_SLAVE_AGENT_PORT=50000
  - CUSTOM_VAR=value
```

## Jenkins Pipeline Example

The included `Jenkinsfile` demonstrates a basic CI/CD pipeline:
1. Checkout source code
2. Run tests
3. Build application
4. Deploy (if applicable)

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs jenkins

# Check disk space
docker system df

# Restart with fresh container
docker-compose down -v
docker-compose up -d --build
```

### Port already in use
```bash
# Change ports in docker-compose.yml
ports:
  - "8081:8080"  # Use different host port
  - "50001:50000"
```

### Memory issues
Increase Docker memory limit to at least 4GB:
- Docker Desktop: Settings > Resources > Memory

### Plugin installation fails
1. Manually install plugins through Jenkins UI
2. Check internet connectivity
3. Restart Jenkins container

## Production Considerations

For production deployment:
1. Use persistent volumes for Jenkins data
2. Configure backup strategy
3. Set up SSL/TLS
4. Implement proper security
5. Use external database if needed
6. Configure agent nodes for scaling

## Security Notes

- Change default admin password after setup
- Review security settings in Jenkins
- Use proper authentication methods
- Keep plugins updated
- Restrict network access appropriately

## Development Tips

- Use Blue Ocean for better pipeline visualization
- Enable Jenkins log capturing for debugging
- Use shared libraries for common pipeline code
- Implement proper credential management
- Use declarative pipelines when possible

## Support

For Jenkins-specific issues:
- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [Jenkins Community](https://www.jenkins.io/chat/)
- [Docker Hub Jenkins](https://hub.docker.com/_/jenkins)
