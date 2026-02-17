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
  private apiUrl = 'http://localhost:5000/api/v1';
  
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
          // حفظ Token في localStorage بعد التسجيل
          if (response.success && response.token) {
            localStorage.setItem('token', response.token);
            
            // جلب بيانات المستخدم من endpoint تاني
            this.getProfile().subscribe({
              next: (profileResponse) => {
                if (profileResponse.success && profileResponse.data) {
                  localStorage.setItem('currentUser', JSON.stringify(profileResponse.data));
                  this.currentUserSubject.next(profileResponse.data);
                }
              },
              error: (error) => {
                console.error('خطأ في جلب بيانات المستخدم:', error);
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
          // حفظ Token في localStorage
          if (response.success && response.token) {
            localStorage.setItem('token', response.token);
            
            // الباك إند بيبعت token بس، فهنجيب الـ user data من endpoint تاني
            this.getProfile().subscribe({
              next: (profileResponse) => {
                if (profileResponse.success && profileResponse.data) {
                  localStorage.setItem('currentUser', JSON.stringify(profileResponse.data));
                  this.currentUserSubject.next(profileResponse.data);
                }
              },
              error: (error) => {
                console.error('خطأ في جلب بيانات المستخدم:', error);
              }
            });
          }
          return response;
        })
      );
  }

  // تسجيل الخروج
  logout() {
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
}