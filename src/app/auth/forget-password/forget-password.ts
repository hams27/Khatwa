import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-forget-password',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forget-password.html',
  styleUrl: './forget-password.css',
  standalone: true
})
export class ForgetPassword implements OnInit, OnDestroy {
  // Form Data
  email = '';
  
  // UI States
  isLoading = false;
  resetSuccess = false;
  resetError = false;
  errorMessage = '';
  
  // Form Validation
  emailTouched = false;
  emailError = '';

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadAOSScript().then(() => {
      // Init once
      (window as any).AOS.init({
        duration: 1000,
        easing: 'ease-out-cubic',
        once: true,
        offset: 50,
      });
    });

    // Re-init AOS on every navigation
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        if ((window as any).AOS) {
          (window as any).AOS.refresh();
        }
      });
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  // ========== AOS LOADING ==========
  private loadAOSScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof (window as any).AOS !== 'undefined') {
        (window as any).AOS.init({
          duration: 1000,
          easing: 'ease-out-cubic',
          once: true,
          offset: 50,
        });
        resolve();
        return;
      }

      const linkElement = document.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.href = 'https://unpkg.com/aos@2.3.1/dist/aos.css';
      document.head.appendChild(linkElement);

      const scriptElement = document.createElement('script');
      scriptElement.src = 'https://unpkg.com/aos@2.3.1/dist/aos.js';
      scriptElement.onload = () => {
        if (typeof (window as any).AOS !== 'undefined') {
          (window as any).AOS.init({
            duration: 1000,
            easing: 'ease-out-cubic',
            once: true,
            offset: 50,
          });
        }
        resolve();
      };
      scriptElement.onerror = () => reject();
      document.body.appendChild(scriptElement);
    });
  }

  // ========== FORM VALIDATION ==========
  validateEmail() {
    this.emailTouched = true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!this.email) {
      this.emailError = 'البريد الإلكتروني مطلوب';
      return false;
    } else if (!emailRegex.test(this.email)) {
      this.emailError = 'البريد الإلكتروني غير صحيح';
      return false;
    } else {
      this.emailError = '';
      return true;
    }
  }

  // ========== RESET PASSWORD SUBMIT ==========
  async onSubmit() {
    // Validate email
    const emailValid = this.validateEmail();

    if (!emailValid) {
      this.shakeForm();
      return;
    }

    // Show loading
    this.isLoading = true;
    this.resetError = false;

    // Simulate API call (هنا هنربط بالـ Backend لاحقاً)
    setTimeout(() => {
      // Simulate success
      this.resetSuccess = true;
      this.isLoading = false;
      
      // You can add logic here to actually send reset email
      console.log('إرسال رابط استعادة كلمة المرور إلى:', this.email);
      
      // Optional: Redirect to login after delay
      // setTimeout(() => {
      //   this.router.navigate(['/login']);
      // }, 3000);
    }, 1500);
  }

  ngAfterViewInit() {
    if ((window as any).AOS) {
      (window as any).AOS.refresh();
    }
  }

  // ========== SHAKE ANIMATION ==========
  shakeForm() {
    const form = document.querySelector('.forget-password-form');
    if (form) {
      form.classList.add('shake');
      setTimeout(() => {
        form.classList.remove('shake');
      }, 500);
    }
  }
}