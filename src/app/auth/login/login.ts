import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
  standalone: true
})
export class Login implements OnInit {
  // Form Data
  email = '';
  password = '';
  rememberMe = false;
  
  // UI States
  showPassword = false;
  isLoading = false;
  loginSuccess = false;
  loginError = false;
  errorMessage = '';
  
  // Form Validation
  emailTouched = false;
  passwordTouched = false;
  emailError = '';
  passwordError = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadAOSScript().then(() => {
      if (typeof (window as any).AOS !== 'undefined') {
        (window as any).AOS.refreshHard();
      }
    });

    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  validateEmail(): boolean {
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

  validatePassword(): boolean {
    this.passwordTouched = true;
    
    if (!this.password) {
      this.passwordError = 'كلمة المرور مطلوبة';
      return false;
    } else if (this.password.length < 6) {
      this.passwordError = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
      return false;
    } else {
      this.passwordError = '';
      return true;
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    const emailValid = this.validateEmail();
    const passwordValid = this.validatePassword();

    if (!emailValid || !passwordValid) {
      this.shakeForm();
      return;
    }

    this.isLoading = true;
    this.loginError = false;

    this.authService.login({ email: this.email, password: this.password })
      .subscribe({
        next: (response: any) => {
          this.loginSuccess = true;
          this.isLoading = false;
          console.log('تم تسجيل الدخول بنجاح:', response);
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 1500);
        },
        error: (error: any) => {
          this.loginError = true;
          this.isLoading = false;
          
          if (error.error && error.error.message) {
            this.errorMessage = error.error.message;
          } else if (error.status === 401) {
            this.errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
          } else if (error.status === 0) {
            this.errorMessage = 'فشل الاتصال بالسيرفر. تأكد من تشغيل Backend';
          } else {
            this.errorMessage = 'حدث خطأ. حاول مرة أخرى';
          }
          
          console.error('خطأ في تسجيل الدخول:', error);
          this.shakeForm();
        }
      });
  }

  shakeForm() {
    const form = document.querySelector('.login-form');
    if (form) {
      form.classList.add('shake');
      setTimeout(() => {
        form.classList.remove('shake');
      }, 500);
    }
  }

  private loadAOSScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof (window as any).AOS !== 'undefined') {
        (window as any).AOS.init({
          duration: 1000,
          easing: 'ease-out-cubic',
          once: false,
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
            once: false,
            offset: 50,
          });
        }
        resolve();
      };
      scriptElement.onerror = () => reject();
      document.body.appendChild(scriptElement);
    });
  }

  loginWithGoogle() {
    this.isLoading = true;
    this.loginError = false;
    window.location.href = `${this.authService.getApiUrl()}/auth/google`;
  }

  loginWithFacebook() {
    this.isLoading = true;
    this.loginError = false;
    window.location.href = `${this.authService.getApiUrl()}/auth/facebook`;
  }

  loginWithApple() {
    this.isLoading = true;
    this.loginError = false;
    window.location.href = `${this.authService.getApiUrl()}/auth/apple`;
  }
}