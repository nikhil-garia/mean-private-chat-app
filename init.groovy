// Basic Jenkins configuration script
import jenkins.model.Jenkins
import hudson.plugins.git.GitTool
import hudson.security.HudsonPrivateSecurityRealm
import hudson.security.FullControlOnceLoggedInAuthorizationStrategy

// Disable Jenkins update center check
Jenkins.instance.crumbIssuer = null

// Configure Git tool
def gitTool = new GitTool("Default")
Jenkins.instance.getDescriptor("hudson.plugins.git.GitTool").setInstallations(gitTool)
Jenkins.instance.save()

println("Basic Jenkins configuration completed")
