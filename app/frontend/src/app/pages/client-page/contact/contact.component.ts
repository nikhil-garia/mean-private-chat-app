import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-client-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
  imports: [CommonModule, FormsModule]
})
export class ContactComponent implements OnInit {
  contactForm = {
    name: '',
    email: '',
    message: ''
  };

  isSubmitting = false;
  submitSuccess = false;
  submitError = '';

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {}

  onSubmit() {
    if (this.isSubmitting) return;

    // Basic validation
    if (!this.contactForm.name || !this.contactForm.email || !this.contactForm.message) {
      this.submitError = 'Please fill in all fields';
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.contactForm.email)) {
      this.submitError = 'Please enter a valid email address';
      return;
    }

    this.isSubmitting = true;
    this.submitError = '';

    this.http.post('/api/v1/contact', this.contactForm).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        this.submitSuccess = true;
        this.contactForm = { name: '', email: '', message: '' };
        
        this.snackBar.open(response.message, '🎉', { 
          duration: 5000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        this.isSubmitting = false;
        this.submitError = error.error?.message || 'Failed to send message. Please try again.';
        
        this.snackBar.open(this.submitError, '❌', { 
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  resetForm() {
    this.contactForm = { name: '', email: '', message: '' };
    this.submitSuccess = false;
    this.submitError = '';
  }
}
