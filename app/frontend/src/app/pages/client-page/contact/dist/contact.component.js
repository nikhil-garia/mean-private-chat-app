"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.ContactComponent = void 0;
var core_1 = require("@angular/core");
var common_1 = require("@angular/common");
var forms_1 = require("@angular/forms");
var ContactComponent = /** @class */ (function () {
    function ContactComponent(http, snackBar) {
        this.http = http;
        this.snackBar = snackBar;
        this.contactForm = {
            name: '',
            email: '',
            message: ''
        };
        this.isSubmitting = false;
        this.submitSuccess = false;
        this.submitError = '';
    }
    ContactComponent.prototype.ngOnInit = function () { };
    ContactComponent.prototype.onSubmit = function () {
        var _this = this;
        if (this.isSubmitting)
            return;
        // Basic validation
        if (!this.contactForm.name || !this.contactForm.email || !this.contactForm.message) {
            this.submitError = 'Please fill in all fields';
            return;
        }
        // Email validation
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(this.contactForm.email)) {
            this.submitError = 'Please enter a valid email address';
            return;
        }
        this.isSubmitting = true;
        this.submitError = '';
        this.http.post('/api/v1/contact', this.contactForm).subscribe({
            next: function (response) {
                _this.isSubmitting = false;
                _this.submitSuccess = true;
                _this.contactForm = { name: '', email: '', message: '' };
                _this.snackBar.open(response.message, '🎉', {
                    duration: 5000,
                    panelClass: ['success-snackbar']
                });
            },
            error: function (error) {
                var _a;
                _this.isSubmitting = false;
                _this.submitError = ((_a = error.error) === null || _a === void 0 ? void 0 : _a.message) || 'Failed to send message. Please try again.';
                _this.snackBar.open(_this.submitError, '❌', {
                    duration: 5000,
                    panelClass: ['error-snackbar']
                });
            }
        });
    };
    ContactComponent.prototype.resetForm = function () {
        this.contactForm = { name: '', email: '', message: '' };
        this.submitSuccess = false;
        this.submitError = '';
    };
    ContactComponent = __decorate([
        core_1.Component({
            selector: 'app-client-contact',
            templateUrl: './contact.component.html',
            styleUrls: ['./contact.component.scss'],
            imports: [common_1.CommonModule, forms_1.FormsModule]
        })
    ], ContactComponent);
    return ContactComponent;
}());
exports.ContactComponent = ContactComponent;
