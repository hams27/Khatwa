import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
  standalone: true
})
export class Register implements OnInit, OnDestroy, AfterViewInit {

  fullName = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';
  acceptTerms = false;

  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  registerSuccess = false;
  registerError = false;
  errorMessage = '';
  formSubmitted = false;

  nameTouched = false;
  emailTouched = false;
  phoneTouched = false;
  passwordTouched = false;
  confirmPasswordTouched = false;

  nameError = '';
  emailError = '';
  phoneError = '';
  passwordError = '';
  confirmPasswordError = '';

  passwordStrength = '';
  passwordStrengthText = '';

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
      (window as any).AOS?.init({ duration: 400, easing: 'ease-out-cubic', once: true, offset: 0 });
    });
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => (window as any).AOS?.refresh());
  }

  ngAfterViewInit() { (window as any).AOS?.refresh(); }
  ngOnDestroy() {
    if (this.lockoutTimer) {
      clearInterval(this.lockoutTimer);
    }
  }

  private loadAOSScript(): Promise<void> {
    return new Promise(resolve => {
      if (typeof (window as any).AOS !== 'undefined') { resolve(); return; }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/aos@2.3.1/dist/aos.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/aos@2.3.1/dist/aos.js';
      script.onload = () => {
        (window as any).AOS?.init({ duration: 400, easing: 'ease-out-cubic', once: true, offset: 0 });
        resolve();
      };
      document.body.appendChild(script);
    });
  }

  // ===== VALIDATION =====
  validateName() {
    this.nameTouched = true;
    if (!this.fullName) { this.nameError = 'الاسم الكامل مطلوب'; return false; }
    if (this.fullName.length < 3) { this.nameError = 'الاسم يجب أن يكون 3 أحرف على الأقل'; return false; }
    this.nameError = ''; return true;
  }

  validateEmail() {
    this.emailTouched = true;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.email) { this.emailError = 'البريد الإلكتروني مطلوب'; return false; }
    if (!regex.test(this.email)) { this.emailError = 'البريد الإلكتروني غير صحيح'; return false; }
    this.emailError = ''; return true;
  }

  validatePhone() {
    this.phoneTouched = true;
    const regex = /^0[0-9]{8,11}$/;
    if (!this.phone) { this.phoneError = 'رقم الهاتف مطلوب'; return false; }
    if (!regex.test(this.phone)) { this.phoneError = 'رقم الهاتف غير صحيح'; return false; }
    this.phoneError = ''; return true;
  }

  validatePassword() {
    this.passwordTouched = true;
    if (!this.password) { this.passwordError = 'كلمة المرور مطلوبة'; this.passwordStrength = ''; return false; }
    if (this.password.length < 6) { this.passwordError = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'; this.calculatePasswordStrength(); return false; }
    this.passwordError = ''; this.calculatePasswordStrength(); return true;
  }

  calculatePasswordStrength() {
    let s = 0;
    if (this.password.length >= 8) s++;
    if (this.password.length >= 12) s++;
    if (/[a-z]/.test(this.password)) s++;
    if (/[A-Z]/.test(this.password)) s++;
    if (/[0-9]/.test(this.password)) s++;
    if (/[^a-zA-Z0-9]/.test(this.password)) s++;
    if (s <= 2) { this.passwordStrength = 'weak'; this.passwordStrengthText = 'ضعيفة'; }
    else if (s <= 4) { this.passwordStrength = 'medium'; this.passwordStrengthText = 'متوسطة'; }
    else { this.passwordStrength = 'strong'; this.passwordStrengthText = 'قوية'; }
  }

  validateConfirmPassword() {
    this.confirmPasswordTouched = true;
    if (!this.confirmPassword) { this.confirmPasswordError = 'تأكيد كلمة المرور مطلوب'; return false; }
    if (this.confirmPassword !== this.password) { this.confirmPasswordError = 'كلمتا المرور غير متطابقتين'; return false; }
    this.confirmPasswordError = ''; return true;
  }

  togglePassword() { this.showPassword = !this.showPassword; }
  toggleConfirmPassword() { this.showConfirmPassword = !this.showConfirmPassword; }

  // ===== SUBMIT =====
  async onSubmit() {
    if (this.isLockedOut) return;

    this.formSubmitted = true;
    const valid =
      this.validateName() &&
      this.validateEmail() &&
      this.validatePhone() &&
      this.validatePassword() &&
      this.validateConfirmPassword();

    if (!valid || !this.acceptTerms) { this.shakeForm(); return; }

    this.isLoading = true;
    this.registerError = false;

    this.authService.register({
      name: this.fullName,
      email: this.email,
      phone: this.phone,
      password: this.password
    }).subscribe({
      next: () => {
        // Reset attempts on success
        this.failedAttempts = 0;
        
        // الـ token والـ user بيتحفظوا تلقائياً في AuthService
        this.registerSuccess = true;
        this.isLoading = false;

        // ✅ روح للـ layout عشان يملا الأسئلة
        setTimeout(() => this.router.navigate(['/layout']), 1500);
      },
      error: (error: any) => {
        this.handleRegisterError(error);
      }
    });
  }

  private handleRegisterError(error: any) {
    this.registerError = true;
    this.isLoading = false;
    this.failedAttempts++;

    // Safe logging
    console.error(`❌ خطأ في التسجيل [Status: ${error.status || 'Unknown'}]`);

    if (this.failedAttempts >= 3) {
      this.handleLockout();
      return;
    }

    if (error.status === 400) {
      this.errorMessage = error.error?.message || 'البيانات غير صالحة أو البريد الإلكتروني مستخدم بالفعل';
    } else if (error.status === 500) {
      this.errorMessage = 'خطأ داخلي في السيرفر. يرجى المحاولة لاحقاً';
    } else if (error.status === 429) {
      this.errorMessage = 'تم تجاوز الحد المسموح للمحاولات، يرجى المحاولة لاحقاً';
    } else if (error.status === 0) {
      this.errorMessage = 'فشل الاتصال بالسيرفر. تأكد من اتصالك بالإنترنت';
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
        this.registerError = false;
        this.cdr.detectChanges();
      }
    }, 1000);
  }

  shakeForm() {
    const form = document.querySelector('.register-form');
    if (form) {
      form.classList.add('shake');
      setTimeout(() => form.classList.remove('shake'), 500);
    }
  }

  registerWithGoogle() { alert('Google Register - سيتم ربطه بالـ Backend قريباً'); }
  registerWithFacebook() { alert('Facebook Register - سيتم ربطه بالـ Backend قريباً'); }
  registerWithApple() { alert('Apple Register - سيتم ربطه بالـ Backend قريباً'); }
}