import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class Register implements OnInit, OnDestroy {
  // Form Data
  fullName = '';
  email = '';
  phone = '';
  password = '';
  confirmPassword = '';
  acceptTerms = false;
  
  // UI States
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  registerSuccess = false;
  registerError = false;
  errorMessage = '';
  formSubmitted = false;
  
  // Form Validation
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
  
  // Password Strength
  passwordStrength = '';
  passwordStrengthText = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadAOSScript().then(() => {
      (window as any).AOS.init({
        duration: 1000,
        easing: 'ease-out-cubic',
        once: true,
        offset: 50,
      });
    });

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

  validateName() {
    this.nameTouched = true;
    
    if (!this.fullName) {
      this.nameError = 'الاسم الكامل مطلوب';
      return false;
    } else if (this.fullName.length < 3) {
      this.nameError = 'الاسم يجب أن يكون 3 أحرف على الأقل';
      return false;
    } else {
      this.nameError = '';
      return true;
    }
  }

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

  validatePhone() {
    this.phoneTouched = true;
    const phoneRegex = /^(05)[0-9]{8}$/;
    
    if (!this.phone) {
      this.phoneError = 'رقم الهاتف مطلوب';
      return false;
    } else if (!phoneRegex.test(this.phone)) {
      this.phoneError = 'رقم الهاتف غير صحيح (مثال: 0512345678)';
      return false;
    } else {
      this.phoneError = '';
      return true;
    }
  }

  validatePassword() {
    this.passwordTouched = true;
    
    if (!this.password) {
      this.passwordError = 'كلمة المرور مطلوبة';
      this.passwordStrength = '';
      this.passwordStrengthText = '';
      return false;
    } else if (this.password.length < 6) {
      this.passwordError = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
      this.calculatePasswordStrength();
      return false;
    } else {
      this.passwordError = '';
      this.calculatePasswordStrength();
      return true;
    }
  }

  calculatePasswordStrength() {
    let strength = 0;
    
    if (this.password.length >= 8) strength++;
    if (this.password.length >= 12) strength++;
    if (/[a-z]/.test(this.password)) strength++;
    if (/[A-Z]/.test(this.password)) strength++;
    if (/[0-9]/.test(this.password)) strength++;
    if (/[^a-zA-Z0-9]/.test(this.password)) strength++;
    
    if (strength <= 2) {
      this.passwordStrength = 'weak';
      this.passwordStrengthText = 'ضعيفة';
    } else if (strength <= 4) {
      this.passwordStrength = 'medium';
      this.passwordStrengthText = 'متوسطة';
    } else {
      this.passwordStrength = 'strong';
      this.passwordStrengthText = 'قوية';
    }
  }

  validateConfirmPassword() {
    this.confirmPasswordTouched = true;
    
    if (!this.confirmPassword) {
      this.confirmPasswordError = 'تأكيد كلمة المرور مطلوب';
      return false;
    } else if (this.confirmPassword !== this.password) {
      this.confirmPasswordError = 'كلمتا المرور غير متطابقتين';
      return false;
    } else {
      this.confirmPasswordError = '';
      return true;
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async onSubmit() {
    this.formSubmitted = true;

    const nameValid = this.validateName();
    const emailValid = this.validateEmail();
    const phoneValid = this.validatePhone();
    const passwordValid = this.validatePassword();
    const confirmPasswordValid = this.validateConfirmPassword();

    if (!nameValid || !emailValid || !phoneValid || !passwordValid || !confirmPasswordValid) {
      this.shakeForm();
      return;
    }

    if (!this.acceptTerms) {
      this.shakeForm();
      return;
    }

    this.isLoading = true;
    this.registerError = false;

    // الاتصال الفعلي بالباك إند
    this.authService.register({
      name: this.fullName,
      email: this.email,
      password: this.password
    }).subscribe({
      next: (response: any) => {
        this.registerSuccess = true;
        this.isLoading = false;
        
        console.log('تم التسجيل بنجاح:', response);
        
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (error: any) => {
        this.registerError = true;
        this.isLoading = false;
        
        if (error.error && error.error.message) {
          this.errorMessage = error.error.message;
        } else if (error.status === 400) {
          this.errorMessage = 'البريد الإلكتروني مستخدم بالفعل';
        } else if (error.status === 0) {
          this.errorMessage = 'فشل الاتصال بالسيرفر';
        } else {
          this.errorMessage = 'حدث خطأ. حاول مرة أخرى';
        }
        
        console.error('خطأ في التسجيل:', error);
        this.shakeForm();
      }
    });
  }

  ngAfterViewInit() {
    if ((window as any).AOS) {
      (window as any).AOS.refresh();
    }
  }

  shakeForm() {
    const form = document.querySelector('.register-form');
    if (form) {
      form.classList.add('shake');
      setTimeout(() => {
        form.classList.remove('shake');
      }, 500);
    }
  }

  registerWithGoogle() {
    console.log('Register with Google');
    alert('Google Register - سيتم ربطه بالـ Backend قريباً');
  }

  registerWithFacebook() {
    console.log('Register with Facebook');
    alert('Facebook Register - سيتم ربطه بالـ Backend قريباً');
  }

  registerWithApple() {
    console.log('Register with Apple');
    alert('Apple Register - سيتم ربطه بالـ Backend قريباً');
  }
}