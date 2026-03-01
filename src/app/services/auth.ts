import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

export interface LoginResponse {
  success: boolean;
  token: string;
  data: {
    user: {
      id: number;
      name: string;
      email: string;
    }
  }
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
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
private apiUrl = 'https://khatwabackend-production.up.railway.app/api/v1';
  
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

            // جلب بيانات المستخدم الكاملة من الباك
            this.getProfile().subscribe({
              next: (profileResponse) => {
                const user =
                  profileResponse?.data?.user ??
                  profileResponse?.data ??
                  profileResponse?.user ??
                  null;
                if (user?.name) {
                  localStorage.setItem('currentUser', JSON.stringify(user));
                  this.currentUserSubject.next(user);
                }
              },
              error: (err) => {
                console.error('خطأ في جلب بيانات المستخدم:', err);
              }
            });
          }

          return response;
        })
      );
  }

  // تسجيل الدخول
  login(data: LoginData): Observable<LoginResponse> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, data)
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

            // استخرج بيانات المستخدم لو موجودة في الـ response مباشرة
            const userFromResponse =
              response?.data?.user ??
              response?.data ??
              response?.user ??
              null;

            if (userFromResponse?.name) {
              localStorage.setItem('currentUser', JSON.stringify(userFromResponse));
              this.currentUserSubject.next(userFromResponse);
            }

            // جلب بيانات المستخدم الكاملة من الباك
            this.getProfile().subscribe({
              next: (profileResponse) => {
                const user =
                  profileResponse?.data?.user ??
                  profileResponse?.data ??
                  profileResponse?.user ??
                  null;
                if (user?.name) {
                  localStorage.setItem('currentUser', JSON.stringify(user));
                  this.currentUserSubject.next(user);
                }
              },
              error: (err) => {
                console.error('خطأ في جلب بيانات المستخدم:', err);
              }
            });
          }

          return response;
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