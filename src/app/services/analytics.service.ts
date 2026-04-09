import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private apiUrl = `${API_BASE_URL}/analytics`;

  constructor(private http: HttpClient) {}

  // الحصول على إحصائيات الداشبورد التحليلي
  getDashboard(projectId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${projectId}/dashboard`);
  }
}
