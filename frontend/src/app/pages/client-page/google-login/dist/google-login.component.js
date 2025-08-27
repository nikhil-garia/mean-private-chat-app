"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.ClientGoogleLoginComponent = void 0;
var core_1 = require("@angular/core");
var ClientGoogleLoginComponent = /** @class */ (function () {
    function ClientGoogleLoginComponent(googleAuth) {
        this.googleAuth = googleAuth;
    }
    ClientGoogleLoginComponent.prototype.ngAfterViewInit = function () {
        this.googleAuth.initialize();
    };
    ClientGoogleLoginComponent = __decorate([
        core_1.Component({
            selector: 'app-client-google-login',
            styleUrl: './google-login.component.scss',
            template: "\n  \n\t\t<!-- Divider -->\n\t\t<div class=\"divider\">\n\t\t  <span class=\"divider-text\">OR</span>\n\t\t</div>\n  \n    <div class=\"social-login-options\">\n        <button type=\"button\" id=\"client-google-button\" class=\"social-btn google\">\n        <i class='bx bxl-google'></i>\n        </button>\n    </div>\n  "
        })
    ], ClientGoogleLoginComponent);
    return ClientGoogleLoginComponent;
}());
exports.ClientGoogleLoginComponent = ClientGoogleLoginComponent;
