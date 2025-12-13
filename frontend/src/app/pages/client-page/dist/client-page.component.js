"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.SecretChatRoom = exports.Reg = exports.Login = exports.ClientPageComponent = void 0;
var core_1 = require("@angular/core");
var router_1 = require("@angular/router");
var auth_service_1 = require("../../services/auth.service");
var socket_service_1 = require("../../services/socket.service");
var snack_bar_1 = require("@angular/material/snack-bar");
var common_1 = require("@angular/common");
var forms_1 = require("@angular/forms");
var google_login_component_1 = require("./google-login/google-login.component");
var ClientPageComponent = /** @class */ (function () {
    function ClientPageComponent() {
        this.isSigninOpen = false;
        this.isSidebarOpen = false;
        this.isRegisterMode = false;
        this.isForgotPasswordMode = false;
        this.isSecretChatRoomOpen = false;
        this.loginLoading = false;
        this.registerLoading = false;
        this.forgotPasswordLoading = false;
        this.secretChatRoomLoading = false;
        this.router = core_1.inject(router_1.Router);
        this.authService = core_1.inject(auth_service_1.AuthService);
        this.socketService = core_1.inject(socket_service_1.SocketService);
        this.snackBar = core_1.inject(snack_bar_1.MatSnackBar);
        this.cdr = core_1.inject(core_1.ChangeDetectorRef);
        this.loginObj = new Login();
        this.regObj = new Reg();
        this.secretChatRoomObj = new SecretChatRoom();
        this.forgotPasswordEmail = '';
        this.authFailError = '';
        this.secretChatRoomError = '';
        this.isValid = false;
    }
    ClientPageComponent.prototype.ngOnInit = function () {
        this.setupParallaxEffect();
        this.setupSigninButton();
        this.setupSidebar();
    };
    ClientPageComponent.prototype.ngOnDestroy = function () {
        // Clean up any event listeners if needed
    };
    ClientPageComponent.prototype.onMouseMove = function (event) {
        this.handleParallax(event);
    };
    ClientPageComponent.prototype.setupParallaxEffect = function () {
        // Initial setup for parallax elements
    };
    ClientPageComponent.prototype.handleParallax = function (event) {
        var x = event.clientX / window.innerWidth - 0.5;
        var y = event.clientY / window.innerHeight - 0.5;
        var parallaxElements = document.querySelectorAll('.parallax');
        parallaxElements.forEach(function (element) {
            var speed = element.getAttribute('data-speed');
            if (speed && element instanceof HTMLElement) {
                element.style.transform = "translate(" + x * Number(speed) * 20 + "px, " + y * Number(speed) * 20 + "px)";
            }
        });
    };
    ClientPageComponent.prototype.setupSigninButton = function () {
        // This will be handled by Angular's template binding
    };
    ClientPageComponent.prototype.setupSidebar = function () {
        // This will be handled by Angular's template binding
    };
    ClientPageComponent.prototype.openSignin = function () {
        this.isSigninOpen = true;
        // Remove any close animation classes and add open animation
        setTimeout(function () {
            var signinPage = document.getElementById('signinPage');
            if (signinPage) {
                signinPage.classList.remove('closeSignin');
                signinPage.classList.add('openSignin');
            }
        }, 0);
    };
    ClientPageComponent.prototype.closeSignin = function () {
        this.isSigninOpen = false;
        // Remove open animation and add close animation
        setTimeout(function () {
            var signinPage = document.getElementById('signinPage');
            if (signinPage) {
                signinPage.classList.remove('openSignin');
                signinPage.classList.add('closeSignin');
            }
        }, 0);
    };
    ClientPageComponent.prototype.openSidebar = function () {
        this.isSidebarOpen = true;
        // Remove any close animation classes and add open animation
        setTimeout(function () {
            var sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.classList.remove('close-sidebar');
                sidebar.classList.add('open-sidebar');
            }
        }, 0);
    };
    ClientPageComponent.prototype.closeSidebar = function () {
        this.isSidebarOpen = false;
        // Remove open animation and add close animation
        setTimeout(function () {
            var sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.classList.remove('open-sidebar');
                sidebar.classList.add('close-sidebar');
            }
        }, 0);
    };
    // Toggle between login and register modes
    ClientPageComponent.prototype.setAuthMode = function (isRegister) {
        this.isRegisterMode = isRegister;
        this.isForgotPasswordMode = false;
        this.authFailError = '';
    };
    // Method to switch to forgot password mode
    ClientPageComponent.prototype.setForgotPasswordMode = function () {
        this.isForgotPasswordMode = true;
        this.isRegisterMode = false;
        this.authFailError = '';
    };
    // Method to open secret chat room modal
    ClientPageComponent.prototype.openSecretChatRoom = function () {
        this.isSecretChatRoomOpen = true;
        // Remove any close animation classes and add open animation
        setTimeout(function () {
            var secretChatRoomPage = document.getElementById('secretChatRoomPage');
            if (secretChatRoomPage) {
                secretChatRoomPage.classList.remove('closeSignin');
                secretChatRoomPage.classList.add('openSignin');
            }
        }, 0);
    };
    // Method to close secret chat room modal
    ClientPageComponent.prototype.closeSecretChatRoom = function () {
        this.isSecretChatRoomOpen = false;
        // Remove open animation and add close animation
        setTimeout(function () {
            var secretChatRoomPage = document.getElementById('secretChatRoomPage');
            if (secretChatRoomPage) {
                secretChatRoomPage.classList.remove('openSignin');
                secretChatRoomPage.classList.add('closeSignin');
            }
        }, 0);
    };
    // Method to handle secret chat room creation
    ClientPageComponent.prototype.onCreateSecretRoom = function () {
        this.secretChatRoomLoading = true;
        this.secretChatRoomError = '';
        if (!this.secretChatRoomObj.name) {
            this.secretChatRoomError = 'Name Required';
            this.isValid = false;
        }
        else {
            this.isValid = true;
        }
        if (this.isValid) {
            // Here you would typically call a service to create the secret chat room
            // For now, we'll just show a success message
            this.snackBar.open("Secret chat room \"" + this.secretChatRoomObj.name + "\" created successfully!", '🎉', { duration: 5000 });
            // Reset the form and close the modal
            this.secretChatRoomObj.name = '';
            this.secretChatRoomLoading = false;
            this.closeSecretChatRoom();
            this.cdr.detectChanges();
        }
        else {
            this.secretChatRoomLoading = false;
            this.cdr.detectChanges();
        }
    };
    // Method to handle signin form submission
    ClientPageComponent.prototype.onSigninSubmit = function () {
        var _this = this;
        this.loginLoading = true;
        this.authFailError = '';
        if (!this.loginObj.email) {
            this.authFailError = 'Email Required';
            this.isValid = false;
        }
        else if (!this.loginObj.password) {
            this.authFailError = 'Password Required';
            this.isValid = false;
        }
        else {
            this.isValid = true;
        }
        if (this.isValid) {
            this.authService.login('/api/v1/login', this.loginObj).subscribe(function (res) {
                if (res.tokenObject) {
                    sessionStorage.setItem('isLoggedin', 'true');
                    localStorage.setItem('auth_token', res.jwtToken);
                    localStorage.setItem('user_id', res.tokenObject._id);
                    _this.socketService.onConnection(); // create a connection to socket
                    _this.snackBar.open('Login Successfully', '🎉', { duration: 5000 });
                    _this.router.navigateByUrl('/chat');
                    _this.cdr.detectChanges();
                }
                else {
                    sessionStorage.setItem('isLoggedin', 'false');
                    _this.authFailError = res.message || 'Login failed';
                    _this.loginLoading = false;
                    _this.cdr.detectChanges();
                }
            }, function (error) {
                var _a;
                _this.loginLoading = false;
                console.error('Login failed: ', error);
                _this.snackBar.open('Login failed.. try again', 'close', { duration: 5000 });
                _this.authFailError = ((_a = error.error) === null || _a === void 0 ? void 0 : _a.message) || 'Login failed';
                _this.cdr.detectChanges();
            });
        }
        else {
            this.loginLoading = false;
            this.cdr.detectChanges();
        }
    };
    // Method to handle forgot password form submission
    ClientPageComponent.prototype.onForgotPasswordSubmit = function () {
        var _this = this;
        this.forgotPasswordLoading = true;
        this.authFailError = '';
        if (!this.forgotPasswordEmail) {
            this.authFailError = 'Email Required';
            this.isValid = false;
        }
        else {
            this.isValid = true;
        }
        if (this.isValid) {
            this.authService.forgotPassword(this.forgotPasswordEmail).subscribe(function (res) {
                if (res.status === 200) {
                    _this.snackBar.open('Password reset link sent to your email!', '🎉', { duration: 5000 });
                    // Switch back to login mode after successful request
                    _this.isForgotPasswordMode = false;
                    // Clear forgot password form
                    _this.forgotPasswordEmail = '';
                    _this.forgotPasswordLoading = false;
                    _this.cdr.detectChanges();
                }
                else {
                    _this.authFailError = res.message || 'Failed to send reset link';
                    _this.forgotPasswordLoading = false;
                    _this.cdr.detectChanges();
                }
            }, function (error) {
                var _a;
                _this.forgotPasswordLoading = false;
                console.error('Forgot password failed: ', error);
                _this.snackBar.open('Failed to send reset link.. try again', 'close', { duration: 5000 });
                _this.authFailError = ((_a = error.error) === null || _a === void 0 ? void 0 : _a.message) || 'Failed to send reset link';
                _this.cdr.detectChanges();
            });
        }
        else {
            this.forgotPasswordLoading = false;
            this.cdr.detectChanges();
        }
    };
    // Method to handle registration form submission
    ClientPageComponent.prototype.onRegisterSubmit = function () {
        var _this = this;
        this.registerLoading = true;
        this.authFailError = '';
        if (!this.regObj.fullName) {
            this.authFailError = 'Full Name Required';
            this.isValid = false;
        }
        else if (!this.regObj.email) {
            this.authFailError = 'Email Required';
            this.isValid = false;
        }
        else if (!this.regObj.password) {
            this.authFailError = 'Password Required';
            this.isValid = false;
        }
        else {
            this.isValid = true;
        }
        if (this.isValid) {
            this.authService.register('/api/v1/register', this.regObj).subscribe(function (res) {
                // Registration successful - automatically log the user in
                _this.snackBar.open('Registration successful! Logging you in...', '🎉', { duration: 3000 });
                // Automatically log the user in with the newly created credentials
                var loginCredentials = {
                    email: _this.regObj.email,
                    password: _this.regObj.password
                };
                _this.authService.login('/api/v1/login', loginCredentials).subscribe(function (loginRes) {
                    if (loginRes.tokenObject) {
                        sessionStorage.setItem('isLoggedin', 'true');
                        localStorage.setItem('auth_token', loginRes.jwtToken);
                        localStorage.setItem('user_id', loginRes.tokenObject._id);
                        _this.socketService.onConnection(); // create a connection to socket
                        _this.snackBar.open('Login Successfully', '🎉', { duration: 5000 });
                        _this.router.navigateByUrl('/chat');
                        _this.cdr.detectChanges();
                    }
                    else {
                        sessionStorage.setItem('isLoggedin', 'false');
                        _this.authFailError = loginRes.message || 'Auto-login failed';
                        _this.registerLoading = false;
                        _this.cdr.detectChanges();
                    }
                }, function (loginError) {
                    _this.registerLoading = false;
                    console.error('Auto-login failed: ', loginError);
                    _this.snackBar.open('Registration successful but auto-login failed. Please login manually.', 'close', { duration: 5000 });
                    // Switch back to login mode
                    _this.isRegisterMode = false;
                    _this.cdr.detectChanges();
                });
            }, function (error) {
                var _a;
                _this.registerLoading = false;
                console.error('Registration failed: ', error);
                _this.snackBar.open('Registration failed.. try again', 'close', { duration: 5000 });
                _this.authFailError = ((_a = error.error) === null || _a === void 0 ? void 0 : _a.message) || 'Registration failed';
                _this.cdr.detectChanges();
            });
        }
        else {
            this.registerLoading = false;
            this.cdr.detectChanges();
        }
    };
    __decorate([
        core_1.HostListener('mousemove', ['$event'])
    ], ClientPageComponent.prototype, "onMouseMove");
    ClientPageComponent = __decorate([
        core_1.Component({
            selector: 'app-client-page',
            templateUrl: './client-page.component.html',
            styleUrls: ['./client-page.component.scss'],
            imports: [common_1.CommonModule, forms_1.FormsModule, google_login_component_1.ClientGoogleLoginComponent]
        })
    ], ClientPageComponent);
    return ClientPageComponent;
}());
exports.ClientPageComponent = ClientPageComponent;
var Login = /** @class */ (function () {
    function Login() {
        this.email = '';
        this.password = '';
    }
    return Login;
}());
exports.Login = Login;
var Reg = /** @class */ (function () {
    function Reg() {
        this.fullName = '';
        this.email = '';
        this.password = '';
    }
    return Reg;
}());
exports.Reg = Reg;
var SecretChatRoom = /** @class */ (function () {
    function SecretChatRoom() {
        this.name = '';
    }
    return SecretChatRoom;
}());
exports.SecretChatRoom = SecretChatRoom;
