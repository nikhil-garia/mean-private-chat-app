@echo off
:: Jenkins Docker Build and Run Script for Windows
:: This script builds and runs the Jenkins Docker container

setlocal enabledelayedexpansion

:: Colors for output (Windows compatible)
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

:: Function to print colored output
:print_info
echo %BLUE%[INFO]%NC% %~1
goto :eof

:print_success
echo %GREEN%[SUCCESS]%NC% %~1
goto :eof

:print_warning
echo %YELLOW%[WARNING]%NC% %~1
goto :eof

:print_error
echo %RED%[ERROR]%NC% %~1
goto :eof

:: Function to check if Docker is installed
:check_docker
docker --version >nul 2>&1
if errorlevel 1 (
    call :print_error "Docker is not installed. Please install Docker first."
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    call :print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit /b 1
)

call :print_success "Docker and Docker Compose are available"
goto :eof

:: Function to stop and remove existing containers
:cleanup
call :print_info "Cleaning up existing containers..."
docker-compose down -v 2>nul
docker system prune -f
call :print_success "Cleanup completed"
goto :eof

:: Function to build the Docker image
:build_image
call :print_info "Building Jenkins Docker image..."
docker-compose build --no-cache
if errorlevel 1 (
    call :print_error "Failed to build Docker image"
    exit /b 1
)
call :print_success "Image built successfully"
goto :eof

:: Function to run the container
:run_container
call :print_info "Starting Jenkins container..."
docker-compose up -d
if errorlevel 1 (
    call :print_error "Failed to start container"
    exit /b 1
)
call :print_success "Container started successfully"
goto :eof

:: Function to wait for Jenkins to be ready
:wait_for_jenkins
call :print_info "Waiting for Jenkins to be ready..."
set /a counter=1
:wait_loop
timeout /t 2 /nobreak >nul
curl -s http://localhost:8080 >nul 2>&1
if not errorlevel 1 (
    call :print_success "Jenkins is ready!"
    goto :eof
)

if !counter! GEQ 60 (
    call :print_error "Jenkins failed to start within 120 seconds"
    exit /b 1
)

set /a counter+=1
echo -n "."
goto :wait_loop

:: Function to show Jenkins admin password
:show_password
call :print_info "Retrieving Jenkins admin password..."
for /f "tokens=*" %%i in ('docker exec jenkins type /var/jenkins_home/secrets/initialAdminPassword 2^>nul') do set "PASSWORD=%%i"
if "!PASSWORD!"=="" set "PASSWORD=Password not found"
echo Jenkins Admin Password: !PASSWORD!
call :print_info "Access Jenkins at: http://localhost:8080"
goto :eof

:: Function to show logs
:show_logs
call :print_info "Showing Jenkins logs..."
docker-compose logs -f jenkins
goto :eof

:: Main script logic
:main
echo ==========================================
echo          Jenkins Docker Setup
echo ==========================================

:: Check if Docker is installed
call :check_docker
if errorlevel 1 exit /b 1

:: Parse command line arguments
set "command=%1"
if "%command%"=="" set "command=build"

if "%command%"=="build" (
    call :cleanup
    call :build_image
    call :run_container
    call :wait_for_jenkins
    call :show_password
) else if "%command%"=="start" (
    call :print_info "Starting Jenkins container..."
    docker-compose up -d
    call :wait_for_jenkins
    call :show_password
) else if "%command%"=="stop" (
    call :print_info "Stopping Jenkins container..."
    docker-compose down
) else if "%command%"=="restart" (
    call :print_info "Restarting Jenkins container..."
    docker-compose restart
    call :wait_for_jenkins
) else if "%command%"=="logs" (
    call :show_logs
) else if "%command%"=="clean" (
    call :cleanup
    call :print_success "All containers and images cleaned"
) else (
    echo Usage: %0 [build^|start^|stop^|restart^|logs^|clean]
    echo   build   - Build and start Jenkins (default)
    echo   start   - Start existing Jenkins container
    echo   stop    - Stop Jenkins container
    echo   restart - Restart Jenkins container
    echo   logs    - Show Jenkins logs
    echo   clean   - Stop and remove all containers
    exit /b 1
)

goto :eof

:: Run main function
call :main %*
