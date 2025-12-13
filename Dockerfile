# Use the official Jenkins image as base
FROM jenkins/jenkins:lts

# Switch to root to install packages
USER root

# Install necessary packages
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Switch back to jenkins user
USER jenkins

# Copy Jenkins configuration files (if any)
COPY jenkins_config/ /usr/share/jenkins/ref/

# Install Jenkins plugins
COPY jenkins.plugins /usr/share/jenkins/ref/plugins/
RUN /usr/local/bin/install-plugins.sh < /usr/share/jenkins/ref/plugins/jenkins.plugins

# Copy custom Jenkins scripts
COPY jenkins_scripts/ /usr/share/jenkins/ref/init.groovy.d/

# Set Jenkins home directory permissions
RUN chown -R jenkins:jenkins /var/jenkins_home

# Expose Jenkins port
EXPOSE 8080

# Expose Jenkins agent communication port
EXPOSE 50000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/login || exit 1

# Jenkins startup command
CMD ["--httpPort=8080"]
