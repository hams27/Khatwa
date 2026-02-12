import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NavigationEnd} from '@angular/router';
import { filter } from 'rxjs/operators';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
}

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
  standalone: true
})
export class Login implements OnInit, OnDestroy {
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
  
  // Animation States
  mouseX = 0;
  mouseY = 0;

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
        (window as any).AOS.refresh(); // important
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

  validatePassword() {
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

  // ========== TOGGLE PASSWORD ==========
  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  // ========== LOGIN SUBMIT ==========
  async onSubmit() {
    // Validate all fields
    const emailValid = this.validateEmail();
    const passwordValid = this.validatePassword();

    if (!emailValid || !passwordValid) {
      this.shakeForm();
      return;
    }

    // Show loading
    this.isLoading = true;
    this.loginError = false;

    // Simulate API call (هنا هنربط بالـ Backend لاحقاً)
    setTimeout(() => {
      // Simulate success - للتجربة فقط
      if (this.email === 'test@test.com' && this.password === '123456') {
        this.loginSuccess = true;
        this.isLoading = false;
        
        // Success animation then redirect
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1500);
      } else {
        this.loginError = true;
        this.errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
        this.isLoading = false;
        this.shakeForm();
      }
    }, 1500);
  }
  ngAfterViewInit() {
  if ((window as any).AOS) {
    (window as any).AOS.refresh();
  }
}


  // ========== SHAKE ANIMATION ==========
  shakeForm() {
    const form = document.querySelector('.login-form');
    if (form) {
      form.classList.add('shake');
      setTimeout(() => {
        form.classList.remove('shake');
      }, 500);
    }
  }

  // ========== SOCIAL LOGIN ==========
  loginWithGoogle() {
    console.log('Login with Google');
    // هنا هنربط بـ Google OAuth لاحقاً
    alert('Google Login - سيتم ربطه بالـ Backend قريباً');
  }

  loginWithFacebook() {
    console.log('Login with Facebook');
    // هنا هنربط بـ Facebook OAuth لاحقاً
    alert('Facebook Login - سيتم ربطه بالـ Backend قريباً');
  }

  loginWithApple() {
    console.log('Login with Apple');
    // هنا هنربط بـ Apple OAuth لاحقاً
    alert('Apple Login - سيتم ربطه بالـ Backend قريباً');
  }
}
