"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.ClientGoogleAuthService = void 0;
var core_1 = require("@angular/core");
var auth_service_1 = require("../../../services/auth.service");
var socket_service_1 = require("../../../services/socket.service");
var router_1 = require("@angular/router");
var environment_1 = require("../../../../environments/environment");
var ClientGoogleAuthService = /** @class */ (function () {
    function ClientGoogleAuthService() {
        this.clientId = environment_1.environment.clientId; // Replace with your actual client ID
        this.authService = core_1.inject(auth_service_1.AuthService);
        this.socketService = core_1.inject(socket_service_1.SocketService);
        this.router = core_1.inject(router_1.Router);
    }
    ClientGoogleAuthService.prototype.initialize = function () {
        var _this = this;
        // Check if Google script is loaded and available
        if (typeof google === 'undefined' || typeof google.accounts === 'undefined') {
            console.warn('Google Sign-In script not loaded yet. Retrying in 100ms...');
            // Retry after a short delay to allow script to load
            setTimeout(function () { return _this.initialize(); }, 100);
            return;
        }
        try {
            google.accounts.id.initialize({
                client_id: this.clientId,
                callback: this.handleCredentialResponse.bind(this)
            });
            // Check if the button element exists
            var buttonElement = document.getElementById("client-google-button");
            if (buttonElement) {
                google.accounts.id.renderButton(buttonElement, { theme: "outline", size: "large", text: "continue_with" } // customize as needed
                );
                // Optional: prompt for one-tap sign-in
                google.accounts.id.prompt();
            }
            else {
                console.warn('Google Sign-In button element not found');
            }
        }
        catch (error) {
            console.error('Failed to initialize Google Sign-In:', error);
        }
    };
    ClientGoogleAuthService.prototype.handleCredentialResponse = function (response) {
        var _this = this;
        var token = response.credential;
        console.log("JWT Token:", token);
        // Send token to backend for verification or decode as needed
        // Send token to your backend
        this.authService.POST('/api/v1/auth/google', { token: token })
            .subscribe({
            next: function (res) {
                console.log(res);
                if (res.tokenObject) {
                    sessionStorage.setItem('isLoggedin', 'true');
                    localStorage.setItem('auth_token', res.jwtToken);
                    localStorage.setItem('user_id', res.tokenObject._id);
                    _this.socketService.onConnection(); //create a connection to socket
                    _this.router.navigateByUrl('/chat');
                }
                else {
                    sessionStorage.setItem('isLoggedin', 'false');
                    alert(res.message);
                }
            },
            error: function (error) {
                if (error.status == 403) {
                    console.error(error);
                }
            }
        });
    };
    ClientGoogleAuthService = __decorate([
        core_1.Injectable({
            providedIn: 'root'
        })
    ], ClientGoogleAuthService);
    return ClientGoogleAuthService;
}());
exports.ClientGoogleAuthService = ClientGoogleAuthService;
