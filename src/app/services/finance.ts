import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api';

export interface FinancialRecord {
  id?: number;
  projectId?: number;
  type: 'revenue' | 'expense';
  amount: number;
  category?: string;
  title?: string;
  description?: string;
  date?: string;
  currency?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
  profitMargin: number;
}

@Injectable({
  providedIn: 'root'
})
export class FinanceService {
  private apiUrl = API_BASE_URL;

  constructor(private http: HttpClient) {}

  // إضافة سجل مالي
  addRecord(projectId: number, record: Partial<FinancialRecord>): Observable<any> {
    return this.http.post(`${this.apiUrl}/projects/${projectId}/finance`, record);
  }

  // الحصول على السجلات المالية
  getRecords(projectId: number, startDate?: string, endDate?: string): Observable<any> {
    let url = `${this.apiUrl}/projects/${projectId}/finance`;
    const params: string[] = [];
    
    if (startDate) params.push(`startDate=${startDate}`);
    if (endDate) params.push(`endDate=${endDate}`);
    if (params.length > 0) url += '?' + params.join('&');
    
    return this.http.get(url);
  }

  // الحصول على الملخص المالي
  getSummary(projectId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/projects/${projectId}/finance/summary`);
  }

  // تحديث سجل مالي
  updateRecord(projectId: number, recordId: number, data: Partial<FinancialRecord>): Observable<any> {
    return this.http.put(`${this.apiUrl}/projects/${projectId}/finance/${recordId}`, data);
  }

  // حذف سجل مالي
  deleteRecord(recordId: number, projectId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/projects/${projectId}/finance/${recordId}`);
  }

  // الحصول على إحصائيات الداشبورد المالي
  getDashboard(projectId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/projects/${projectId}/finance-dashboard`);
  }
}
