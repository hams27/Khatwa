import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api';

export interface Report {
  id?: number;
  projectId?: number;
  createdBy?: number;
  type: 'financial' | 'marketing' | 'tasks' | 'team' | 'overall' | 'custom';
  format: 'pdf' | 'excel';
  dateFrom?: string;
  dateTo?: string;
  status?: 'generated' | 'failed';
  viewsCount?: number;
  downloadsCount?: number;
  sharesCount?: number;
  data?: any;
  aiSummary?: string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = API_BASE_URL;

  constructor(private http: HttpClient) {}

  // إنشاء تقرير
  generateReport(projectId: number, data: { type: string; format: string; dateFrom?: string; dateTo?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/projects/${projectId}/reports`, data);
  }

  // الحصول على تقارير المشروع
  getReports(projectId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/projects/${projectId}/reports`);
  }

  // الحصول على تقرير محدد
  getReport(reportId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/reports/${reportId}`);
  }

  // تتبع حدث على التقرير (عرض، تحميل، مشاركة)
  trackReport(reportId: number, action: 'view' | 'download' | 'share'): Observable<any> {
    return this.http.post(`${this.apiUrl}/reports/${reportId}/track`, { action });
  }
}
