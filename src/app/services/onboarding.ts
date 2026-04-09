import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api';

export interface OnboardingProject {
  id?: number;
  name: string;
  description: string;
  stage: 'idea' | 'operating';
  industry?: string;
  logoUrl?: string;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  private apiUrl = `${API_BASE_URL}/projects`;

  constructor(private http: HttpClient) {}

  // إنشاء مشروع جديد (أثناء الـ Onboarding)
  createProject(project: Partial<OnboardingProject>): Observable<any> {
    return this.http.post(this.apiUrl, project);
  }

  // الحصول على كل المشاريع
  getProjects(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  // الحصول على مشروع محدد
  getProject(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  // تحديث مشروع
  updateProject(id: number, project: Partial<OnboardingProject>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, project);
  }

  // حذف مشروع
  deleteProject(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
