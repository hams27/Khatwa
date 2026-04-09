import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { API_BASE_URL } from '../config/api';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  data: AuthUser;
}

export interface RegisterData {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  provider?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Base URL للـ Backend
private apiUrl = API_BASE_URL;
  
  // BehaviorSubject لتتبع حالة تسجيل الدخول
  private currentUserSubject: BehaviorSubject<any>;
  public currentUser: Observable<any>;

  constructor(private http: HttpClient) {
    // قراءة البيانات المحفوظة من localStorage
    const storedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<any>(
      storedUser ? JSON.parse(storedUser) : null
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  // الحصول على بيانات المستخدم الحالي
  public get currentUserValue() {
    return this.currentUserSubject.value;
  }

  // تسجيل مستخدم جديد
  register(data: RegisterData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/register`, data)
      .pipe(
        map(response => {
          // ✅ استخرج الـ token من أي شكل ممكن يرجعه الباك
          const token =
            response?.token ??
            response?.data?.token ??
            response?.accessToken ??
            response?.access_token ??
            null;

          if (token) {
            localStorage.setItem('token', token);

            // ✅ احفظ الاسم فوراً من بيانات التسجيل قبل ما getProfile يرجع
            const immediateUser = { name: data.name, email: data.email };
            localStorage.setItem('currentUser', JSON.stringify(immediateUser));
            this.currentUserSubject.next(immediateUser);

            // تم إيقاف getProfile مؤقتاً بسبب خطأ job_title في الـ Backend
          }

          // Securely remove token from response before returning to component
          const secureResponse = { ...response };
          if (secureResponse.token) delete secureResponse.token;
          if (secureResponse.data?.token) delete secureResponse.data.token;
          if (secureResponse.accessToken) delete secureResponse.accessToken;
          if (secureResponse.access_token) delete secureResponse.access_token;
          
          return secureResponse;
        })
      );
  }

  // ⚠️ TODO - Backend Fix Required
  // endpoint: POST /api/v1/auth/login
  // المشكلة: الـ Backend بيرجع 500 error بسبب unknown column 'job_title' في جدول الـ users
  // المطلوب من الـ Backend: إضافة عامود job_title في جدول الـ users في الداتابيز
  // أو حذف job_title من كود الـ Backend لو مش محتاجينه
  // بعد الحل: نرجع نفعّل getProfile() اللي اتعلقت في السطور دي

  // تسجيل الدخول
  login(data: LoginData): Observable<AuthResponse> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, data)
      .pipe(
        map(response => {
          const token =
            response?.token ??
            response?.data?.token ??
            response?.accessToken ??
            response?.access_token ??
            null;

          if (token) {
            localStorage.setItem('token', token);

            const userFromResponse =
              response?.data?.user ??
              response?.data ??
              response?.user ??
              null;

            if (userFromResponse?.name) {
              localStorage.setItem('currentUser', JSON.stringify(userFromResponse));
              this.currentUserSubject.next(userFromResponse);
            }

            // تم إيقاف getProfile مؤقتاً بسبب خطأ job_title في الـ Backend
          }

          // Securely remove token from response before returning to component
          const secureResponse = { ...response };
          if (secureResponse.token) delete secureResponse.token;
          if (secureResponse.data?.token) delete secureResponse.data.token;
          if (secureResponse.accessToken) delete secureResponse.accessToken;
          if (secureResponse.access_token) delete secureResponse.access_token;

          return secureResponse;
        }),
        catchError(error => {
          // لو الباك رجع 500 بس في token في الـ error body — نستخدمه
          const body = error?.error;
          const token =
            body?.token ??
            body?.data?.token ??
            body?.accessToken ??
            null;

          if (token) {
            localStorage.setItem('token', token);
            const user = body?.data?.user ?? body?.data ?? body?.user ?? null;
            if (user?.name) {
              localStorage.setItem('currentUser', JSON.stringify(user));
              this.currentUserSubject.next(user);
            }
            
            // Securely remove token from error body
            const secureBody = { ...body };
            if (secureBody.token) delete secureBody.token;
            if (secureBody.data?.token) delete secureBody.data.token;
            if (secureBody.accessToken) delete secureBody.accessToken;
            
            return of(secureBody);
          }

          return throwError(() => error);
        })
      );
  }

  // تسجيل الخروج
  logout() {
    // امسح بيانات الـ onboarding المرتبطة بالـ user الحالي
    const user = this.currentUserSubject.value;
    if (user) {
      const uid = user.id ?? user.email ?? 'guest';
      localStorage.removeItem(`onboarding_progress_${uid}`);
    }
    // امسح الـ key القديم (للتوافق مع الإصدار السابق)
    localStorage.removeItem('onboarding_progress');

    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  // الحصول على بروفايل المستخدم
  getProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/me`);
  }

  // التحقق من تسجيل الدخول
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  // الحصول على Token
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // طلب استعادة كلمة المرور
  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/forgotpassword`, { email });
  }

  // إعادة تعيين كلمة المرور باستخدام التوكن
  resetPassword(token: string, password: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/auth/resetpassword/${token}`, { password });
  }

  // الحصول على base API URL (للـ social login redirects)
  getApiUrl(): string {
    return this.apiUrl;
  }

  // معالجة الـ token الجاي من Social OAuth redirect
  handleSocialLoginToken(token: string) {
    localStorage.setItem('token', token);
    this.getProfile().subscribe({
      next: (profileResponse) => {
        const user = profileResponse?.data?.user ?? profileResponse?.data ?? profileResponse?.user ?? null;
        if (user?.name) {
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
        }
      },
      error: (error) => {
        console.error('خطأ في جلب بيانات المستخدم:', error);
      }
    });
  }
}
