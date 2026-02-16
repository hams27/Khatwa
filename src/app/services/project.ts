import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Project {
  id?: number;
  name: string;
  description: string;
  stage: 'idea' | 'planning' | 'execution' | 'operation';
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = 'http://localhost:5000/api/v1/projects';

  constructor(private http: HttpClient) {}

  // إنشاء مشروع جديد
  createProject(project: Project): Observable<any> {
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
}