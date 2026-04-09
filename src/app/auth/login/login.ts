import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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

  // Rate Limiting
  failedAttempts = 0;
  isLockedOut = false;
  lockoutRemaining = 0;
  private lockoutTimer: any;

  constructor(
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
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

  ngOnDestroy() {
    if (this.lockoutTimer) {
      clearInterval(this.lockoutTimer);
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

  // ⚠️ TODO - Backend Fix Required
  // endpoint: POST /api/v1/auth/login
  // المشكلة: الـ Backend بيرجع 500 error بسبب unknown column 'job_title' في جدول الـ users
  // الـ workaround الحالي: بنتحقق من localStorage مباشرة لو الـ token اتحفظ رغم الـ 500
  // المطلوب من الـ Backend: إضافة عامود job_title أو حذفه من كود الـ Backend
  // بعد الحل: نشيل سطر localStorage.getItem('token') من الـ token check هنا

  async onSubmit() {
    if (this.isLockedOut) return;

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
          // Reset attempts on success
          this.failedAttempts = 0;

          // Note: Token is now safely extracted and saved by AuthService.
          // The response returned here has the token removed for security.
          // We just check if AuthService successfully saved it.
          if (this.authService.isLoggedIn()) {
            this.loginSuccess = true;
            this.isLoading = false;
            this.router.navigate(['/dashboard']);
          } else {
            // الباك رد بس مفيش token خالص
            this.handleLoginError({ status: 500, message: 'استجابة غير صالحة من السيرفر' });
          }
        },
        error: (error: any) => {
          this.handleLoginError(error);
        }
      });
  }

  private handleLoginError(error: any) {
    this.loginError = true;
    this.isLoading = false;
    this.failedAttempts++;

    // Safe error logging
    console.error(`❌ خطأ في تسجيل الدخول [Status: ${error.status || 'Unknown'}]`);

    if (this.failedAttempts >= 3) {
      this.handleLockout();
      return;
    }

    if (error.status === 401 || error.status === 400) {
      this.errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    } else if (error.status === 500) {
      this.errorMessage = 'خطأ داخلي في السيرفر. يرجى المحاولة لاحقاً';
    } else if (error.status === 429) {
      this.errorMessage = 'تم تجاوز الحد المسموح للمحاولات، يرجى المحاولة لاحقاً';
    } else if (error.status === 0) {
      this.errorMessage = 'فشل الاتصال بالسيرفر. تأكد من اتصالك بالإنترنت';
    } else if (error.error?.message) {
      this.errorMessage = error.error.message;
    } else {
      this.errorMessage = 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى';
    }

    this.cdr.detectChanges();
    this.shakeForm();
  }

  private handleLockout() {
    this.isLockedOut = true;
    const baseLockout = 30; // 30 seconds
    this.lockoutRemaining = baseLockout * Math.pow(2, this.failedAttempts - 3);
    
    this.errorMessage = `تم حظر المحاولات مؤقتاً. يرجى الانتظار ${this.lockoutRemaining} ثانية`;
    this.cdr.detectChanges();
    this.shakeForm();
    
    this.lockoutTimer = setInterval(() => {
      this.lockoutRemaining--;
      this.errorMessage = `تم حظر المحاولات مؤقتاً. يرجى الانتظار ${this.lockoutRemaining} ثانية`;
      this.cdr.detectChanges();
      
      if (this.lockoutRemaining <= 0) {
        clearInterval(this.lockoutTimer);
        this.isLockedOut = false;
        this.errorMessage = '';
        this.loginError = false;
        this.cdr.detectChanges();
      }
    }, 1000);
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
          duration: 400,
          easing: 'ease-out-cubic',
          once: false,
          offset: 0,
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
            duration: 400,
            easing: 'ease-out-cubic',
            once: false,
            offset: 0,
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