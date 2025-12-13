"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.Login = exports.ClientPageComponent = void 0;
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
        this.loginLoading = false;
        this.router = core_1.inject(router_1.Router);
        this.authService = core_1.inject(auth_service_1.AuthService);
        this.socketService = core_1.inject(socket_service_1.SocketService);
        this.snackBar = core_1.inject(snack_bar_1.MatSnackBar);
        this.cdr = core_1.inject(core_1.ChangeDetectorRef);
        this.loginObj = new Login();
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
