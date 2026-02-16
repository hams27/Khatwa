import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FinancialRecord {
  id?: number;
  projectId: number;
  type: 'revenue' | 'expense';
  amount: number;
  category: string;
  description?: string;
  date: string;
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
  private apiUrl = 'http://localhost:5000/api/v1';

  constructor(private http: HttpClient) {}

  addRecord(projectId: number, record: FinancialRecord): Observable<any> {
    return this.http.post(`${this.apiUrl}/projects/${projectId}/finance`, record);
  }

  getRecords(projectId: number, startDate?: string, endDate?: string): Observable<any> {
    let url = `${this.apiUrl}/projects/${projectId}/finance`;
    const params: string[] = [];
    
    if (startDate) params.push(`startDate=${startDate}`);
    if (endDate) params.push(`endDate=${endDate}`);
    if (params.length > 0) url += '?' + params.join('&');
    
    return this.http.get(url);
  }

  getSummary(projectId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/projects/${projectId}/finance/summary`);
  }

  deleteRecord(recordId: number, projectId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/projects/${projectId}/finance/${recordId}`);
  }
}