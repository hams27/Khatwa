import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  private apiUrl = 'http://localhost:5000/api/v1';
  private currentUserSubject: BehaviorSubject<any>;
  public currentUser: Observable<any>;

  constructor(private http: HttpClient) {
    const storedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<any>(
      storedUser ? JSON.parse(storedUser) : null
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue() {
    return this.currentUserSubject.value;
  }

 register(data: RegisterData): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/auth/register`, data)
    .pipe(
      map(response => {
        console.log('Register response:', response);
        return response;
      })
    );
}

 login(data: LoginData): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/auth/login`, data)
    .pipe(
      map(response => {
        console.log('Response from backend:', response); // للتأكد من الشكل
        
        // التعامل مع أشكال مختلفة من الـ Response
        if (response && response.token) {
          localStorage.setItem('token', response.token);
          
          // حفظ بيانات المستخدم
          const user = response.user || response.data?.user || response;
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
        }
        
        return response;
      })
    );
}

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  getProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/me`);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}