import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
  standalone: true
})
export class ResetPassword implements OnInit {
  // Route param
  token = '';

  // Form Data
  password = '';
  confirmPassword = '';

  // UI States
  isLoading = false;
  resetSuccess = false;
  resetError = false;
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;

  // Form Validation
  passwordTouched = false;
  confirmTouched = false;
  passwordError = '';
  confirmError = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') || '';

    if (!this.token) {
      this.resetError = true;
      this.errorMessage = 'رابط إعادة التعيين غير صالح';
    }
  }

  // ========== FORM VALIDATION ==========
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

  validateConfirmPassword() {
    this.confirmTouched = true;

    if (!this.confirmPassword) {
      this.confirmError = 'تأكيد كلمة المرور مطلوب';
      return false;
    } else if (this.confirmPassword !== this.password) {
      this.confirmError = 'كلمات المرور غير متطابقة';
      return false;
    } else {
      this.confirmError = '';
      return true;
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // ========== SUBMIT ==========
  onSubmit() {
    const passwordValid = this.validatePassword();
    const confirmValid = this.validateConfirmPassword();

    if (!passwordValid || !confirmValid) {
      return;
    }

    this.isLoading = true;
    this.resetError = false;
    this.errorMessage = '';

    this.authService.resetPassword(this.token, this.password).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.resetSuccess = true;

        // حفظ التوكن الجديد لو الـ API رجعه
        const token =
          response?.token ??
          response?.data?.token ??
          response?.accessToken ??
          null;

        if (token) {
          localStorage.setItem('token', token);
        }

        // الانتقال لصفحة الدخول بعد 3 ثواني
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (error) => {
        this.isLoading = false;
        this.resetError = true;

        if (error.status === 400) {
          this.errorMessage = 'الرابط غير صالح أو منتهي الصلاحية';
        } else if (error.error?.message) {
          this.errorMessage = error.error.message;
        } else {
          this.errorMessage = 'حدث خطأ أثناء إعادة تعيين كلمة المرور';
        }
      }
    });
  }
}
