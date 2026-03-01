import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Task {
 id?: number;
  projectId: number;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  dueDate?: string;
  createdAt?: string;
  assignedTo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private apiUrl = 'https://khatwabackend-production.up.railway.app/api/v1';

  constructor(private http: HttpClient) {}

  // إنشاء مهمة
  createTask(projectId: number, task: Task): Observable<any> {
    return this.http.post(`${this.apiUrl}/projects/${projectId}/tasks`, task);
  }

  // الحصول على مهام المشروع
  getTasks(projectId: number, status?: string): Observable<any> {
    const url = status 
      ? `${this.apiUrl}/projects/${projectId}/tasks?status=${status}`
      : `${this.apiUrl}/projects/${projectId}/tasks`;
    return this.http.get(url);
  }

  // تحديث حالة المهمة
  updateTask(taskId: number, updates: Partial<Task>): Observable<any> {
    return this.http.put(`${this.apiUrl}/tasks/${taskId}`, updates);
  }

  // حذف مهمة
  deleteTask(taskId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/tasks/${taskId}`);
  }
}