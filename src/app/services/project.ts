import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api';

export interface Project {
  id?: number;
  ownerId?: number;
  name: string;
  description?: string;
  industry?: string;
  stage: 'idea' | 'planning' | 'execution' | 'operating';
  logoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  onboardingData?: {
    aiAnalysisResult?: any;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = `${API_BASE_URL}/projects`;

  constructor(private http: HttpClient) {}

  // إنشاء مشروع جديد
  createProject(project: Partial<Project>): Observable<any> {
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
  updateProject(id: number, project: Partial<Project>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, project);
  }

  // حذف مشروع
  deleteProject(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // الحصول على إحصائيات الداشبورد
  getDashboard(projectId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${projectId}/dashboard`);
  }
}
