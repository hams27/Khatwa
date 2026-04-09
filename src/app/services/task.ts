import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api';

export interface Task {
  id?: number;
  projectId?: number;
  title: string;
  description?: string;
  assignedTo?: number | null;
  status: 'todo' | 'in_progress' | 'in-progress' | 'review' | 'done';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private apiUrl = API_BASE_URL;

  constructor(private http: HttpClient) {}

  // إنشاء مهمة
  createTask(projectId: number, task: Partial<Task>): Observable<any> {
    return this.http.post(`${this.apiUrl}/projects/${projectId}/tasks`, task);
  }

  // الحصول على مهام المشروع
  getTasks(projectId: number, status?: string): Observable<any> {
    const url = status 
      ? `${this.apiUrl}/projects/${projectId}/tasks?status=${status}`
      : `${this.apiUrl}/projects/${projectId}/tasks`;
    return this.http.get(url);
  }

  // تحديث مهمة
  updateTask(taskId: number, updates: Partial<Task>): Observable<any> {
    return this.http.put(`${this.apiUrl}/tasks/${taskId}`, updates);
  }

  // حذف مهمة
  deleteTask(taskId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/tasks/${taskId}`);
  }
}
